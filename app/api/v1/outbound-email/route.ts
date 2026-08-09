import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { normalizeMessageId, parseReferences } from "@/lib/inbound-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/outbound-email
 *
 * Called by the sequencer immediately after it sends outreach, to bank the
 * Message-ID of what went out. This is the half of reply detection everybody
 * forgets: without it, an incoming reply can only be matched by guessing at
 * the from-address, which fails the moment somebody answers from their phone
 * or hands the thread to a colleague.
 *
 * Sending also moves a cold contact to `contacted` — the one lifecycle step
 * that is purely mechanical, and so worth doing automatically.
 *
 * {
 *   "message_id": "<CADnq...@mail.gmail.com>",   // as returned by the SMTP send
 *   "contact_email": "jane@acme.com",
 *   "subject": "Quick question about Acme's onboarding",
 *   "sent_at": "2026-08-09T10:31:00Z",           // optional, defaults to now
 *   "lead_id": "…"                               // optional
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

  const str = (key: string) => {
    const value = body[key];
    return typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : null;
  };

  const messageId = normalizeMessageId(body.message_id);
  if (!messageId) {
    return jsonError(
      400,
      "`message_id` is required — it is what a later reply is matched against.",
    );
  }

  const { supabase, workspaceId } = auth;

  // ---------------------------------------------------------- contact
  // Looked up, never created: outreach to somebody who is not in the CRM is a
  // mistake worth surfacing rather than quietly papering over.
  let contactId: string | null = null;
  let currentLifecycle: string | null = null;
  const contactEmail = str("contact_email");

  if (contactEmail) {
    const { data } = await supabase
      .from("contacts")
      .select("id, lifecycle")
      .eq("workspace_id", workspaceId)
      .ilike("email", contactEmail)
      .maybeSingle();

    if (data) {
      contactId = data.id as string;
      currentLifecycle = data.lifecycle as string;
    }
  }

  const sentAt = str("sent_at") ?? new Date().toISOString();

  // Re-sending the same Message-ID is a retry, not a second email.
  const { data: recorded, error } = await supabase
    .from("email_messages")
    .upsert(
      {
        workspace_id: workspaceId,
        direction: "outbound",
        message_id: messageId,
        in_reply_to: normalizeMessageId(body.in_reply_to),
        reference_ids: parseReferences(body.references),
        contact_id: contactId,
        lead_id: str("lead_id"),
        subject: str("subject"),
        from_email: str("from_email"),
        to_email: contactEmail,
        occurred_at: sentAt,
      },
      { onConflict: "workspace_id,message_id" },
    )
    .select("id")
    .single();

  if (error) return jsonError(500, error.message);

  // --------------------------------------------------------- lifecycle
  if (contactId) {
    const update: Record<string, string> = { last_contacted_at: sentAt };
    if (currentLifecycle === "new") update.lifecycle = "contacted";

    await supabase
      .from("contacts")
      .update(update)
      .eq("id", contactId)
      .eq("workspace_id", workspaceId);
  }

  return Response.json(
    {
      id: recorded.id,
      message_id: messageId,
      contact_id: contactId,
      // A false here means replies to this thread will land in the unmatched
      // queue instead of on a person. Worth alerting on in the n8n flow.
      contact_matched: contactId !== null,
    },
    { status: 201 },
  );
}

/** GET /api/v1/outbound-email?limit= — what we have sent, most recent first. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);

  const { data, error } = await auth.supabase
    .from("email_messages")
    .select("*, contact:contacts(id, first_name, last_name, email)")
    .eq("workspace_id", auth.workspaceId)
    .eq("direction", "outbound")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return jsonError(500, error.message);
  return Response.json({ messages: data ?? [] });
}
