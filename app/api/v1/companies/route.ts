import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { importCompanies, logImportRun } from "@/lib/import";
import { toRecords } from "@/app/api/v1/contacts/route";

export const dynamic = "force-dynamic";

const MAX_RECORDS = 1000;

/**
 * POST /api/v1/companies
 *
 * Body: a single object, or { companies: [...] }, or a bare array.
 * Name is the identity within a workspace.
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

  const records = toRecords(body, "companies");
  if (!records) {
    return jsonError(
      400,
      'Send an object, an array, or { "companies": [ ... ] }.',
    );
  }
  if (records.length > MAX_RECORDS) {
    return jsonError(
      413,
      `Too many records in one request (${records.length}). The maximum is ${MAX_RECORDS}.`,
    );
  }

  const result = await importCompanies(auth.supabase, auth.workspaceId, records);
  await logImportRun(
    auth.supabase,
    auth.workspaceId,
    "companies",
    "api",
    result,
    "api",
  );

  return Response.json(result, { status: result.failed > 0 ? 207 : 200 });
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);

  const { data, error } = await auth.supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", auth.workspaceId)
    .order("name")
    .limit(limit);

  if (error) return jsonError(500, error.message);
  return Response.json({ companies: data ?? [] });
}
