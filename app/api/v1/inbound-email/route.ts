import { authenticateRequest, jsonError } from "@/lib/api-auth";
import {
  CLASSIFICATION_LABELS,
  classifyInbound,
  lifecycleFor,
  matchContact,
  normalizeMessageId,
  parseReferences,
  syntheticMessageId,
  type InboundEnvelope,
} from "@/lib/inbound-email";

export const dynamic = "force-dynamic";

/** Bodies are stored for context, not archival. Enough to read the reply. */
const MAX_BODY = 20_000;

/**
 * POST /api/v1/inbound-email
 *
 * Every message the mailbox receives is posted here — by n8n reading iCloud
 * over IMAP today, by a provider webhook if that ever changes. The payload is
 * a normalised envelope rather than raw RFC 822 precisely so the transport can
 * be swapped without touching the CRM.
 *
 * The endpoint is deliberately safe to call twice. IMAP redelivers whenever a
 * poll is interrupted, so idempotency is a requirement, not a nicety.
 *
 * {
 *   "message_id": "<CAF...@mail.acme.com>",
 *   "in_reply_to": "<our-original@mail.me.com>",
 *   "references": "<a@x> <b@y>",
 *   "from_email": "jane@acme.com",
 *   "from_name": "Jane Roe",
 *   "subject": "Re: Quick question about Acme's onboarding",
 *   "text": "Sure, happy to chat — how about Thursday?",
 *   "headers": { "auto-submitted": "...", "precedence": "..." },
 *   "received_at": "2026-08-09T11:02:00Z"
 * }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Body must be valid JSON.");
  }

  const str = (...keys: string[]) => {
    for (const key of keys) {
      const value = body[key];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return null;
  };

  const rawHeaders = body.headers;
  const headers: Record<string, string> = {};
  if (rawHeaders && typeof rawHeaders === "object" && !Array.isArray(rawHeaders)) {
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value === "string") headers[key.toLowerCase()] = value;
      else if (Array.isArray(value)) headers[key.toLowerCase()] = value.join(" ");
    }
  }

  const fromEmail = (str("from_email", "from") ?? "").toLowerCase() || null;
  const occurredAt = str("received_at", "date", "occurred_at") ?? new Date().toISOString();
  const bodyText = str("text", "body", "text_plain", "textPlain");

  const envelope: InboundEnvelope = {
    messageId: normalizeMessageId(body.message_id ?? body.messageId),
    inReplyTo: normalizeMessageId(body.in_reply_to ?? body.inReplyTo),
    references: parseReferences(body.references),
    fromEmail,
    fromName: str("from_name", "fromName"),
    toEmail: str("to_email", "to"),
    subject: str("subject"),
    body: bodyText ? bodyText.slice(0, MAX_BODY) : null,
    headers,
    occurredAt,
  };

  // A missing Message-ID is not a reason to drop a real reply — derive a
  // stable one so the unique index can still recognise a redelivery.
  const messageId = envelope.messageId ?? syntheticMessageId(envelope);

  const { supabase, workspaceId } = auth;

  // ----------------------------------------------------------- dedupe
  const { data: existing } = await supabase
    .from("email_messages")
    .select("id, classification, contact_id")
    .eq("workspace_id", workspaceId)
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing) {
    return Response.json({
      id: existing.id,
      duplicate: true,
      classification: existing.classification,
      contact_id: existing.contact_id,
    });
  }

  // --------------------------------------------------------- classify
  const classification = classifyInbound(envelope);

  // ------------------------------------------------------------ match
  const { contactId, leadId, matchedBy } = await matchContact(
    supabase,
    workspaceId,
    envelope,
  );

  // ------------------------------------------------------------ store
  const { data: stored, error } = await supabase
    .from("email_messages")
    .insert({
      workspace_id: workspaceId,
      direction: "inbound",
      message_id: messageId,
      in_reply_to: envelope.inReplyTo,
      reference_ids: envelope.references,
      contact_id: contactId,
      lead_id: leadId,
      subject: envelope.subject,
      from_email: envelope.fromEmail,
      from_name: envelope.fromName,
      to_email: envelope.toEmail,
      body: envelope.body,
      classification,
      matched_by: matchedBy,
      headers: Object.keys(headers).length > 0 ? headers : null,
      occurred_at: envelope.occurredAt,
    })
    .select("id")
    .single();

  if (error) return jsonError(500, error.message);

  // --------------------------------------------------- act on the person
  // Nothing below runs for unmatched mail: it sits in the queue until a human
  // says who it was from, which is the honest outcome when we do not know.
  let lifecycleChange: string | null = null;

  if (contactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("lifecycle")
      .eq("id", contactId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const update: Record<string, string> = {};
    const next = lifecycleFor(classification, contact?.lifecycle ?? "new");
    if (next) {
      update.lifecycle = next;
      lifecycleChange = next;
    }

    if (classification === "human") update.last_reply_at = envelope.occurredAt;
    if (classification === "bounce") update.bounced_at = envelope.occurredAt;
    if (classification === "unsubscribe") {
      update.unsubscribed_at = envelope.occurredAt;
    }

    if (Object.keys(update).length > 0) {
      await supabase
        .from("contacts")
        .update(update)
        .eq("id", contactId)
        .eq("workspace_id", workspaceId);
    }

    // The timeline is where a human goes to understand a contact, so every
    // verdict lands there — including the robots, clearly labelled.
    await supabase.from("activities").insert({
      workspace_id: workspaceId,
      type: "email",
      subject: `${CLASSIFICATION_LABELS[classification]}: ${
        envelope.subject ?? "(no subject)"
      }`,
      body: envelope.body,
      contact_id: contactId,
      lead_id: leadId,
      author: "Inbox",
    });
  }

  return Response.json(
    {
      id: stored.id,
      classification,
      contact_id: contactId,
      matched_by: matchedBy,
      lifecycle: lifecycleChange,
    },
    { status: 201 },
  );
}

/**
 * GET /api/v1/inbound-email?classification=human&unmatched=true&limit=
 *
 * Reading the queue back, for a dashboard or a nightly "did we miss anyone"
 * check in n8n.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
  const classification = url.searchParams.get("classification");
  const unmatched = url.searchParams.get("unmatched");

  let query = auth.supabase
    .from("email_messages")
    .select("*, contact:contacts(id, first_name, last_name, email)")
    .eq("workspace_id", auth.workspaceId)
    .eq("direction", "inbound")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (classification) query = query.eq("classification", classification);
  if (unmatched === "true") query = query.is("contact_id", null);

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);
  return Response.json({ messages: data ?? [] });
}
