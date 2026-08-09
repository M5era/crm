import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityWithRelations,
  Company,
  Contact,
  ContactWithCompany,
  EmailMessage,
  EmailMessageWithContact,
  Lead,
  LeadWithRelations,
  Stage,
  StageEvent,
} from "@/lib/types";

/**
 * Every read here takes a workspaceId and filters on it. Workspaces are
 * separate businesses, so a query that forgets the filter is a data leak
 * between them — keeping the parameter first and required makes that hard to
 * do by accident.
 */

const LEAD_SELECT = `
  *,
  stage:stages(*),
  company:companies(id, name, domain),
  contact:contacts(id, first_name, last_name, email, title)
`;

/** Supabase embeds a to-one relation as an object; PostgREST types it loosely. */
function unwrap<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normaliseLead(row: Record<string, unknown>): LeadWithRelations {
  return {
    ...(row as unknown as Lead),
    value: Number(row.value ?? 0),
    stage: unwrap(row.stage as Stage) as Stage,
    company: unwrap(row.company as LeadWithRelations["company"]),
    contact: unwrap(row.contact as LeadWithRelations["contact"]),
  };
}

/**
 * Whether the signed-in account is on the CRM allowlist.
 *
 * Row level security hides every table from non-members, so a signed-in
 * stranger would otherwise see an eerily empty CRM with no explanation.
 * Workspaces are always seeded, so reading zero of them means "not a member".
 */
export async function hasCrmAccess(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}

// ------------------------------------------------------------------ stages

export async function getStages(workspaceId: string): Promise<Stage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------- leads

export async function getLeads(
  workspaceId: string,
  options?: {
    status?: "open" | "won" | "lost";
    companyId?: string;
    contactId?: string;
    search?: string;
  },
): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("workspace_id", workspaceId);

  if (options?.status) q = q.eq("status", options.status);
  if (options?.companyId) q = q.eq("company_id", options.companyId);
  if (options?.contactId) q = q.eq("contact_id", options.contactId);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);

  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normaliseLead);
}

export async function getLead(
  workspaceId: string,
  id: string,
): Promise<LeadWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normaliseLead(data) : null;
}

/** Stage transition history for one lead, oldest first. */
export async function getLeadStageHistory(
  leadId: string,
): Promise<Array<StageEvent & { from_stage: Stage | null; to_stage: Stage }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_events")
    .select("*, from_stage:stages!from_stage_id(*), to_stage:stages!to_stage_id(*)")
    .eq("lead_id", leadId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as unknown as StageEvent),
    from_stage: unwrap(row.from_stage as Stage),
    to_stage: unwrap(row.to_stage as Stage) as Stage,
  }));
}

/** The board: every stage with its leads, ordered by pipeline position. */
export async function getPipeline(workspaceId: string) {
  const [stages, leads] = await Promise.all([
    getStages(workspaceId),
    getLeads(workspaceId),
  ]);

  const open = leads.filter((l) => l.status !== "lost");

  return stages.map((stage) => {
    const stageLeads = open
      .filter((lead) => lead.stage_id === stage.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    return {
      stage,
      leads: stageLeads,
      value: stageLeads.reduce((sum, l) => sum + l.value, 0),
    };
  });
}

// ---------------------------------------------------------------- contacts

export async function getContacts(
  workspaceId: string,
  search?: string,
  lifecycle?: string,
): Promise<Array<ContactWithCompany & { lead_count: number; open_value: number }>> {
  const supabase = await createClient();
  let q = supabase
    .from("contacts")
    .select("*, company:companies(id, name, domain)")
    .eq("workspace_id", workspaceId);

  if (lifecycle) q = q.eq("lifecycle", lifecycle);

  if (search) {
    const term = `%${search}%`;
    q = q.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},title.ilike.${term}`,
    );
  }

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;

  const contacts = (data ?? []).map((row) => ({
    ...(row as unknown as Contact),
    company: unwrap(row.company as ContactWithCompany["company"]),
  }));

  // One extra round trip instead of N — every lead in this workspace.
  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select("contact_id, value, status")
    .eq("workspace_id", workspaceId);
  if (leadError) throw leadError;

  return contacts.map((contact) => {
    const related = (leadRows ?? []).filter((l) => l.contact_id === contact.id);
    return {
      ...contact,
      lead_count: related.length,
      open_value: related
        .filter((l) => l.status === "open")
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    };
  });
}

export async function getContact(
  workspaceId: string,
  id: string,
): Promise<ContactWithCompany | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(id, name, domain)")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...(data as unknown as Contact),
    company: unwrap(data.company as ContactWithCompany["company"]),
  };
}

// --------------------------------------------------------------- companies

export async function getCompanies(
  workspaceId: string,
  search?: string,
): Promise<
  Array<
    Company & {
      contact_count: number;
      lead_count: number;
      open_value: number;
      won_value: number;
    }
  >
> {
  const supabase = await createClient();
  let q = supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (search) {
    const term = `%${search}%`;
    q = q.or(`name.ilike.${term},domain.ilike.${term},industry.ilike.${term}`);
  }

  const { data, error } = await q.order("name");
  if (error) throw error;

  const [{ data: contactRows }, { data: leadRows }] = await Promise.all([
    supabase.from("contacts").select("company_id").eq("workspace_id", workspaceId),
    supabase
      .from("leads")
      .select("company_id, value, status")
      .eq("workspace_id", workspaceId),
  ]);

  return (data ?? []).map((company) => {
    const leads = (leadRows ?? []).filter((l) => l.company_id === company.id);
    return {
      ...(company as Company),
      contact_count: (contactRows ?? []).filter(
        (c) => c.company_id === company.id,
      ).length,
      lead_count: leads.length,
      open_value: leads
        .filter((l) => l.status === "open")
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0),
      won_value: leads
        .filter((l) => l.status === "won")
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    };
  });
}

export async function getCompany(
  workspaceId: string,
  id: string,
): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Company) ?? null;
}

export async function getCompanyContacts(
  workspaceId: string,
  companyId: string,
): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

// -------------------------------------------------------------- activities

export async function getActivities(
  workspaceId: string,
  filter: {
    leadId?: string;
    contactId?: string;
    companyId?: string;
    limit?: number;
  },
): Promise<Activity[]> {
  const supabase = await createClient();
  let q = supabase
    .from("activities")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (filter.leadId) q = q.eq("lead_id", filter.leadId);
  if (filter.contactId) q = q.eq("contact_id", filter.contactId);
  if (filter.companyId) q = q.eq("company_id", filter.companyId);

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function getRecentActivity(
  workspaceId: string,
  limit = 12,
): Promise<ActivityWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `*,
       lead:leads(id, title),
       contact:contacts(id, first_name, last_name, email, title),
       company:companies(id, name, domain)`,
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as unknown as Activity),
    lead: unwrap(row.lead as ActivityWithRelations["lead"]),
    contact: unwrap(row.contact as ActivityWithRelations["contact"]),
    company: unwrap(row.company as ActivityWithRelations["company"]),
  }));
}

// --------------------------------------------------------- picker helpers

export async function getCompanyOptions(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function getContactOptions(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, company_id")
    .eq("workspace_id", workspaceId)
    .order("first_name");
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    company_id: string | null;
  }>;
}

// ---------------------------------------------------------------- settings

export async function getApiKeys(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").ApiKey[];
}

export async function getImportRuns(workspaceId: string, limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").ImportRun[];
}

/** How many deals sit in each stage — settings needs this to know what is
 *  safe to delete. */
export async function getStageUsage(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("stage_id")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.stage_id as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Contacts grouped by lifecycle — the outreach funnel, which is deliberately
 *  not the deal pipeline. */
export async function getLifecycleCounts(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("lifecycle")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = (row.lifecycle as string) ?? "new";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// ------------------------------------------------------------------- inbox

/**
 * Inbound mail, newest first. `unmatched` narrows to the queue of messages we
 * could not attribute to anybody — the honest resting place for a reply whose
 * sender is not in the CRM, and the one list worth clearing by hand.
 */
export async function getInboundMessages(
  workspaceId: string,
  classification?: string,
  unmatched?: boolean,
  limit = 200,
): Promise<EmailMessageWithContact[]> {
  const supabase = await createClient();
  let q = supabase
    .from("email_messages")
    .select("*, contact:contacts(id, first_name, last_name, email, title)")
    .eq("workspace_id", workspaceId)
    .eq("direction", "inbound");

  if (classification) q = q.eq("classification", classification);
  if (unmatched) q = q.is("contact_id", null);

  const { data, error } = await q
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as unknown as EmailMessage),
    contact: unwrap(row.contact as EmailMessageWithContact["contact"]),
  }));
}

/** Inbound mail grouped by verdict, plus how much of it is unattributed. */
export async function getInboundCounts(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("classification, contact_id")
    .eq("workspace_id", workspaceId)
    .eq("direction", "inbound");
  if (error) throw error;

  const counts = new Map<string, number>();
  let unmatched = 0;
  for (const row of data ?? []) {
    const key = (row.classification as string) ?? "human";
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!row.contact_id) unmatched += 1;
  }
  return { counts, unmatched, total: (data ?? []).length };
}

/** The thread on one person's profile: what we sent and what came back. */
export async function getContactEmails(
  workspaceId: string,
  contactId: string,
  limit = 50,
): Promise<EmailMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as EmailMessage[];
}
