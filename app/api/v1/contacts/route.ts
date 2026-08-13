import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { importContacts, logImportRun } from "@/lib/import";

export const dynamic = "force-dynamic";

/** One request may carry a whole list; beyond this, page it. */
const MAX_RECORDS = 1000;

/**
 * POST /api/v1/contacts
 *
 * Body: a single object, or { contacts: [...] }, or a bare array.
 * Email is the identity within a workspace, so re-posting the same list
 * updates rather than duplicates.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body must be valid JSON.");
  }

  const records = toRecords(body, "contacts");
  if (!records) {
    return jsonError(
      400,
      'Send an object, an array, or { "contacts": [ ... ] }.',
    );
  }
  if (records.length > MAX_RECORDS) {
    return jsonError(
      413,
      `Too many records in one request (${records.length}). The maximum is ${MAX_RECORDS}.`,
    );
  }

  const result = await importContacts(auth.supabase, auth.workspaceId, records);
  await logImportRun(
    auth.supabase,
    auth.workspaceId,
    "contacts",
    "api",
    result,
    "api",
  );

  return Response.json(result, { status: result.failed > 0 ? 207 : 200 });
}

/**
 * GET /api/v1/contacts?limit=&lifecycle=&verification= — read the workspace's
 * people back. `verification` takes a comma list so a sequencer can ask for
 * every mailable verdict at once: ?verification=ok,role.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
  const lifecycle = url.searchParams.get("lifecycle");
  const verification = url.searchParams.get("verification");

  let query = auth.supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", auth.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (lifecycle) query = query.eq("lifecycle", lifecycle);
  if (verification) {
    query = query.in(
      "verification",
      verification.split(",").map((v) => v.trim()).filter(Boolean),
    );
  }

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);

  return Response.json({ contacts: data ?? [] });
}

/** Accept a single object, a bare array, or { <key>: [...] }. */
export function toRecords(
  body: unknown,
  key: string,
): Array<Record<string, string>> | null {
  if (Array.isArray(body)) return body as Array<Record<string, string>>;
  if (body && typeof body === "object") {
    const wrapped = (body as Record<string, unknown>)[key];
    if (Array.isArray(wrapped)) return wrapped as Array<Record<string, string>>;
    return [body as Record<string, string>];
  }
  return null;
}
