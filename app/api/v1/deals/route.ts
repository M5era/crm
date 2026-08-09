import { authenticateRequest, jsonError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/deals
 *
 * The endpoint an automation calls when a cold contact actually replies:
 * it promotes a person into the pipeline. Everything is optional except a
 * title — pass `contact_email` and/or `company_name` and they are matched (or
 * created) inside the workspace, so a webhook does not need to know any ids.
 *
 * {
 *   "title": "Acme — automation retainer",
 *   "contact_email": "jane@acme.com",
 *   "company_name": "Acme Inc.",
 *   "value": 12000,
 *   "source": "Cold outreach",
 *   "stage": "contacted",          // stage key; defaults to the first stage
 *   "set_contact_lifecycle": "replied"
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

  const title = str("title");
  if (!title) return jsonError(400, "`title` is required.");

  const { supabase, workspaceId } = auth;

  // ------------------------------------------------------------ stage
  const stageKey = str("stage");
  let stageId: string | null = null;

  if (stageKey) {
    const { data } = await supabase
      .from("stages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("key", stageKey)
      .maybeSingle();
    if (!data) {
      return jsonError(400, `No stage with key "${stageKey}" in this workspace.`);
    }
    stageId = data.id as string;
  } else {
    const { data } = await supabase
      .from("stages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("position")
      .limit(1)
      .maybeSingle();
    stageId = (data?.id as string) ?? null;
  }
  if (!stageId) return jsonError(400, "This workspace has no pipeline stages.");

  // ---------------------------------------------------------- company
  let companyId: string | null = null;
  const companyName = str("company_name");
  if (companyName) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", companyName)
      .maybeSingle();

    if (existing) {
      companyId = existing.id as string;
    } else {
      const { data: created, error } = await supabase
        .from("companies")
        .insert({ workspace_id: workspaceId, name: companyName })
        .select("id")
        .single();
      if (error) return jsonError(500, error.message);
      companyId = created.id as string;
    }
  }

  // ---------------------------------------------------------- contact
  let contactId: string | null = null;
  const contactEmail = str("contact_email");
  if (contactEmail) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("email", contactEmail)
      .maybeSingle();

    if (existing) {
      contactId = existing.id as string;
    } else {
      const { data: created, error } = await supabase
        .from("contacts")
        .insert({
          workspace_id: workspaceId,
          first_name:
            str("contact_first_name") ?? contactEmail.split("@")[0],
          last_name: str("contact_last_name"),
          email: contactEmail,
          company_id: companyId,
          lifecycle: "replied",
        })
        .select("id")
        .single();
      if (error) return jsonError(500, error.message);
      contactId = created.id as string;
    }

    // Replying is what moved this person forward — record it on the contact,
    // not only on the deal.
    const lifecycle = str("set_contact_lifecycle") ?? "replied";
    await supabase
      .from("contacts")
      .update({ lifecycle, last_contacted_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("workspace_id", workspaceId);
  }

  // ------------------------------------------------------------- deal
  const rawValue = body.value;
  const value =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
        ? Number(rawValue.replace(/[^0-9.-]/g, "")) || 0
        : 0;

  const { data: deal, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      title,
      stage_id: stageId,
      company_id: companyId,
      contact_id: contactId,
      value,
      source: str("source"),
      owner: str("owner"),
      expected_close_date: str("expected_close_date"),
      notes: str("notes"),
    })
    .select("*")
    .single();

  if (error) return jsonError(500, error.message);

  return Response.json({ deal }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
  const status = url.searchParams.get("status");

  let query = auth.supabase
    .from("leads")
    .select("*, stage:stages(key, name), company:companies(name), contact:contacts(email)")
    .eq("workspace_id", auth.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);
  return Response.json({ deals: data ?? [] });
}
