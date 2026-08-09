"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_ALIASES, COMPANY_ALIASES, parseCsvRecords } from "@/lib/csv";
import { importCompanies, importContacts, logImportRun } from "@/lib/import";
import { generateToken } from "@/lib/api-auth";
import type { ActivityType, LeadStatus } from "@/lib/types";

export type ActionState = {
  error?: string;
  ok?: boolean;
  /** Shown to the user on success, e.g. an import summary. */
  message?: string;
  /** A one-time secret the dialog must display and never store. */
  secret?: string;
  /** Where the dialog should send the user after a successful save. */
  redirectTo?: string;
};

/** Empty form fields should land as NULL, not as empty strings. */
function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function number(form: FormData, key: string): number {
  const value = text(form, key);
  if (!value) return 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function revalidateEverything() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------- leads

export async function createLead(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const title = text(form, "title");
  if (!title) return { error: "Give the lead a name." };

  const workspaceId = text(form, "workspace_id");
  if (!workspaceId) return { error: "Missing workspace." };

  const supabase = await createClient();
  let stageId = text(form, "stage_id");

  if (!stageId) {
    const { data } = await supabase
      .from("stages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("position")
      .limit(1)
      .maybeSingle();
    stageId = (data?.id as string) ?? null;
  }
  if (!stageId) return { error: "No pipeline stages are configured." };

  const { error } = await supabase.from("leads").insert({
    workspace_id: workspaceId,
    title,
    stage_id: stageId,
    company_id: text(form, "company_id"),
    contact_id: text(form, "contact_id"),
    value: number(form, "value"),
    source: text(form, "source"),
    owner: text(form, "owner"),
    expected_close_date: text(form, "expected_close_date"),
    notes: text(form, "notes"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateLead(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const title = text(form, "title");
  if (!id) return { error: "Missing lead id." };
  if (!title) return { error: "Give the lead a name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      title,
      company_id: text(form, "company_id"),
      contact_id: text(form, "contact_id"),
      stage_id: text(form, "stage_id"),
      value: number(form, "value"),
      source: text(form, "source"),
      owner: text(form, "owner"),
      expected_close_date: text(form, "expected_close_date"),
      notes: text(form, "notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

/** Called by the board on drop, and by the stage picker on a lead page. */
export async function moveLeadToStage(leadId: string, stageId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ stage_id: stageId })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidateEverything();
}

export async function setLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidateEverything();
}

export async function deleteLead(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const slug = form.get("workspace_slug");
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidateEverything();
  redirect(typeof slug === "string" ? `/${slug}/pipeline` : "/");
}

// ---------------------------------------------------------------- contacts

export async function createContact(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const firstName = text(form, "first_name");
  if (!firstName) return { error: "A first name is required." };

  const workspaceId = text(form, "workspace_id");
  if (!workspaceId) return { error: "Missing workspace." };

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    workspace_id: workspaceId,
    first_name: firstName,
    last_name: text(form, "last_name"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    title: text(form, "title"),
    company_id: text(form, "company_id"),
    linkedin: text(form, "linkedin"),
    source: text(form, "source"),
    notes: text(form, "notes"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateContact(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const firstName = text(form, "first_name");
  if (!id) return { error: "Missing contact id." };
  if (!firstName) return { error: "A first name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      first_name: firstName,
      last_name: text(form, "last_name"),
      email: text(form, "email"),
      phone: text(form, "phone"),
      title: text(form, "title"),
      company_id: text(form, "company_id"),
      linkedin: text(form, "linkedin"),
      source: text(form, "source"),
      notes: text(form, "notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteContact(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const slug = form.get("workspace_slug");
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidateEverything();
  redirect(typeof slug === "string" ? `/${slug}/contacts` : "/");
}

// --------------------------------------------------------------- companies

export async function createCompany(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = text(form, "name");
  if (!name) return { error: "A company name is required." };

  const workspaceId = text(form, "workspace_id");
  if (!workspaceId) return { error: "Missing workspace." };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    workspace_id: workspaceId,
    name,
    domain: text(form, "domain"),
    website: text(form, "website"),
    industry: text(form, "industry"),
    size: text(form, "size"),
    location: text(form, "location"),
    description: text(form, "description"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateCompany(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id) return { error: "Missing company id." };
  if (!name) return { error: "A company name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      domain: text(form, "domain"),
      website: text(form, "website"),
      industry: text(form, "industry"),
      size: text(form, "size"),
      location: text(form, "location"),
      description: text(form, "description"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteCompany(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const slug = form.get("workspace_slug");
  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", id);
  revalidateEverything();
  redirect(typeof slug === "string" ? `/${slug}/companies` : "/");
}

// -------------------------------------------------------------- activities

export async function createActivity(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const subject = text(form, "subject");
  if (!subject) return { error: "Add a short summary." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspaceId = text(form, "workspace_id");
  if (!workspaceId) return { error: "Missing workspace." };

  const { error } = await supabase.from("activities").insert({
    workspace_id: workspaceId,
    type: (text(form, "type") ?? "note") as ActivityType,
    subject,
    body: text(form, "body"),
    lead_id: text(form, "lead_id"),
    contact_id: text(form, "contact_id"),
    company_id: text(form, "company_id"),
    author: user?.email ?? null,
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteActivity(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", id);
  revalidateEverything();
}

// ---------------------------------------------------------------- auth

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// -------------------------------------------------------------- workspaces

/** Slugs live in URLs, so keep them predictable and collision-free. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Slugs that would shadow a real route inside a workspace. */
const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "analytics",
  "companies",
  "contacts",
  "leads",
  "pipeline",
  "settings",
]);

export async function createWorkspace(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = text(form, "name");
  if (!name) return { error: "Give the workspace a name." };

  const slug = slugify(text(form, "slug") ?? name);
  if (!slug) return { error: "That name produces an empty URL. Try another." };
  if (RESERVED_SLUGS.has(slug)) {
    return { error: `"${slug}" is reserved. Pick a different name or URL.` };
  }

  const supabase = await createClient();

  const { data: clash } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) return { error: `The URL "/${slug}" is already taken.` };

  const { data: last } = await supabase
    .from("workspaces")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      slug,
      description: text(form, "description"),
      accent: text(form, "accent") ?? "#7c6cff",
      position: ((last?.position as number) ?? -1) + 1,
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };

  // A workspace with no stages has an unusable pipeline, so seed the generic
  // set. They are editable straight away in settings.
  const template = [
    { key: "new", name: "New Lead", position: 0, color: "#184f95", is_won: false },
    { key: "contacted", name: "Contacted", position: 1, color: "#2a78d6", is_won: false },
    { key: "qualified", name: "Qualified", position: 2, color: "#5598e7", is_won: false },
    { key: "proposal", name: "Proposal Sent", position: 3, color: "#86b6ef", is_won: false },
    { key: "won", name: "Closed Won", position: 4, color: "#b7d3f6", is_won: true },
  ];
  await supabase
    .from("stages")
    .insert(template.map((s) => ({ ...s, workspace_id: workspace.id })));

  revalidateEverything();
  return { ok: true, redirectTo: `/${workspace.slug}/settings` };
}

export async function updateWorkspace(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id) return { error: "Missing workspace id." };
  if (!name) return { error: "Give the workspace a name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      description: text(form, "description"),
      accent: text(form, "accent") ?? "#7c6cff",
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

// ------------------------------------------------------------------ stages

export async function createStage(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const workspaceId = text(form, "workspace_id");
  const name = text(form, "name");
  if (!workspaceId) return { error: "Missing workspace." };
  if (!name) return { error: "Give the stage a name." };

  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("stages")
    .select("key, position")
    .eq("workspace_id", workspaceId)
    .order("position");

  const used = new Set((stages ?? []).map((s) => s.key as string));
  let key = slugify(name) || "stage";
  if (used.has(key)) {
    let n = 2;
    while (used.has(`${key}-${n}`)) n++;
    key = `${key}-${n}`;
  }

  // New stages land before the winning stage, which stays last.
  const nextPosition = (stages ?? []).length;

  const { error } = await supabase.from("stages").insert({
    workspace_id: workspaceId,
    key,
    name,
    description: text(form, "description"),
    position: nextPosition,
    color: "#5598e7",
    is_won: false,
  });

  if (error) return { error: error.message };
  await recolourStages(workspaceId);
  revalidateEverything();
  return { ok: true };
}

export async function updateStage(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const workspaceId = text(form, "workspace_id");
  const name = text(form, "name");
  if (!id || !workspaceId) return { error: "Missing stage." };
  if (!name) return { error: "Give the stage a name." };

  const supabase = await createClient();
  const isWon = form.get("is_won") === "on";

  // Exactly one stage can be the winning one, or revenue would double-count.
  if (isWon) {
    await supabase
      .from("stages")
      .update({ is_won: false })
      .eq("workspace_id", workspaceId)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("stages")
    .update({ name, description: text(form, "description"), is_won: isWon })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

/** Move a stage one place left or right on the board. */
export async function moveStage(
  stageId: string,
  workspaceId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("stages")
    .select("id, position")
    .eq("workspace_id", workspaceId)
    .order("position");

  if (!stages) return;
  const index = stages.findIndex((s) => s.id === stageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= stages.length) return;

  // Swap through a temporary position: the two rows would otherwise collide
  // if a uniqueness constraint is ever added to (workspace_id, position).
  await supabase
    .from("stages")
    .update({ position: -1 })
    .eq("id", stages[index].id);
  await supabase
    .from("stages")
    .update({ position: stages[index].position })
    .eq("id", stages[target].id);
  await supabase
    .from("stages")
    .update({ position: stages[target].position })
    .eq("id", stages[index].id);

  await recolourStages(workspaceId);
  revalidateEverything();
}

export async function deleteStage(form: FormData) {
  const id = form.get("id");
  const workspaceId = form.get("workspace_id");
  if (typeof id !== "string" || typeof workspaceId !== "string") return;

  const supabase = await createClient();

  // A stage holding deals cannot be dropped — the foreign key restricts it,
  // and silently moving those deals somewhere else would lose information.
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id);

  if ((count ?? 0) > 0) return;

  await supabase.from("stages").delete().eq("id", id).eq("workspace_id", workspaceId);
  await renumberStages(workspaceId);
  await recolourStages(workspaceId);
  revalidateEverything();
}

/** Close gaps so positions stay 0..n-1 after a deletion. */
async function renumberStages(workspaceId: string) {
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("stages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("position");

  await Promise.all(
    (stages ?? []).map((stage, index) =>
      supabase.from("stages").update({ position: index }).eq("id", stage.id),
    ),
  );
}

/**
 * Re-spread stage colours across the validated ordinal ramp whenever the
 * pipeline changes shape, so the board keeps reading dark-to-light regardless
 * of how many stages there are.
 */
async function recolourStages(workspaceId: string) {
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("stages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("position");

  const list = stages ?? [];
  await Promise.all(
    list.map((stage, index) =>
      supabase
        .from("stages")
        .update({ color: rampColor(index, list.length) })
        .eq("id", stage.id),
    ),
  );
}

/** Sample the five-step ramp for a pipeline of any length. */
function rampColor(index: number, total: number) {
  const ramp = ["#184f95", "#2a78d6", "#5598e7", "#86b6ef", "#b7d3f6"];
  if (total <= 1) return ramp[0];
  const position = (index / (total - 1)) * (ramp.length - 1);
  return ramp[Math.round(position)];
}

// ---------------------------------------------------------------- contacts

export async function setContactLifecycle(
  contactId: string,
  lifecycle: string,
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { lifecycle };
  // Marking someone contacted is the moment outreach went out.
  if (lifecycle === "contacted") {
    patch.last_contacted_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", contactId);
  if (error) throw new Error(error.message);
  revalidateEverything();
}

/** Promote a contact into the pipeline — the "lead conversion" moment. */
export async function convertContactToDeal(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const contactId = text(form, "contact_id");
  const workspaceId = text(form, "workspace_id");
  const title = text(form, "title");
  if (!contactId || !workspaceId) return { error: "Missing contact." };
  if (!title) return { error: "Give the deal a name." };

  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, company_id")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!contact) return { error: "That contact no longer exists." };

  let stageId = text(form, "stage_id");
  if (!stageId) {
    const { data } = await supabase
      .from("stages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("position")
      .limit(1)
      .maybeSingle();
    stageId = (data?.id as string) ?? null;
  }
  if (!stageId) return { error: "No pipeline stages are configured." };

  const { error } = await supabase.from("leads").insert({
    workspace_id: workspaceId,
    title,
    stage_id: stageId,
    contact_id: contactId,
    company_id: contact.company_id,
    value: number(form, "value"),
    source: text(form, "source"),
    owner: text(form, "owner"),
    expected_close_date: text(form, "expected_close_date"),
    notes: text(form, "notes"),
  });
  if (error) return { error: error.message };

  // Someone with a live deal is qualified by definition.
  await supabase
    .from("contacts")
    .update({ lifecycle: "qualified" })
    .eq("id", contactId);

  revalidateEverything();
  return { ok: true };
}

// ----------------------------------------------------------------- import

export async function importCsv(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const workspaceId = text(form, "workspace_id");
  const entity = text(form, "entity") ?? "contacts";
  if (!workspaceId) return { error: "Missing workspace." };

  const file = form.get("file");
  const pasted = text(form, "csv");

  let csv = pasted ?? "";
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { error: "That file is over 8 MB. Split it and import in parts." };
    }
    csv = await file.text();
  }
  if (!csv.trim()) return { error: "Choose a CSV file, or paste rows below." };

  const aliases = entity === "companies" ? COMPANY_ALIASES : CONTACT_ALIASES;
  const { records, unmapped } = parseCsvRecords(csv, aliases);

  if (records.length === 0) {
    return {
      error:
        "No rows found. The first line must be a header row naming the columns.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result =
    entity === "companies"
      ? await importCompanies(supabase, workspaceId, records)
      : await importContacts(supabase, workspaceId, records);

  await logImportRun(
    supabase,
    workspaceId,
    entity,
    "csv",
    result,
    user?.email ?? null,
  );

  revalidateEverything();

  const parts = [`${result.created} created`, `${result.updated} updated`];
  if (result.failed > 0) parts.push(`${result.failed} skipped`);
  if (unmapped.length > 0) {
    parts.push(`ignored columns: ${unmapped.slice(0, 5).join(", ")}`);
  }

  return { ok: true, message: parts.join(" · ") };
}

// --------------------------------------------------------------- api keys

export async function createApiKey(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const workspaceId = text(form, "workspace_id");
  const name = text(form, "name");
  if (!workspaceId) return { error: "Missing workspace." };
  if (!name) return { error: "Name the key so you know what to revoke later." };

  const { token, hash, prefix } = generateToken();

  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").insert({
    workspace_id: workspaceId,
    name,
    token_hash: hash,
    token_prefix: prefix,
  });

  if (error) return { error: error.message };
  revalidateEverything();

  // The only time the plaintext token exists. It is not recoverable later.
  return { ok: true, secret: token };
}

export async function revokeApiKey(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidateEverything();
}
