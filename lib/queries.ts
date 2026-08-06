import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityWithRelations,
  Company,
  Contact,
  ContactWithCompany,
  Lead,
  LeadWithRelations,
  Stage,
  StageEvent,
} from "@/lib/types";

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
 * Stages are always seeded, so reading zero of them means "not a member".
 */
export async function hasCrmAccess(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("stages")
    .select("id", { count: "exact", head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}

// ------------------------------------------------------------------ stages

export async function getStages(): Promise<Stage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stages")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------- leads

export async function getLeads(options?: {
  status?: "open" | "won" | "lost";
  companyId?: string;
  contactId?: string;
  search?: string;
}): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  let q = supabase.from("leads").select(LEAD_SELECT);

  if (options?.status) q = q.eq("status", options.status);
  if (options?.companyId) q = q.eq("company_id", options.companyId);
  if (options?.contactId) q = q.eq("contact_id", options.contactId);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);

  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normaliseLead);
}

export async function getLead(id: string): Promise<LeadWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normaliseLead(data) : null;
}

/** Stage transition history for one lead, oldest first. */
export async function getLeadStageHistory(leadId: string): Promise<
  Array<StageEvent & { from_stage: Stage | null; to_stage: Stage }>
> {
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
export async function getPipeline() {
  const [stages, leads] = await Promise.all([
    getStages(),
    getLeads({ status: undefined }),
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

export async function getContacts(search?: string): Promise<
  Array<ContactWithCompany & { lead_count: number; open_value: number }>
> {
  const supabase = await createClient();
  let q = supabase
    .from("contacts")
    .select("*, company:companies(id, name, domain)");

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

  // One extra round trip instead of N — every lead that belongs to a contact.
  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select("contact_id, value, status");
  if (leadError) throw leadError;

  return contacts.map((contact) => {
    const related = (leadRows ?? []).filter(
      (l) => l.contact_id === contact.id,
    );
    return {
      ...contact,
      lead_count: related.length,
      open_value: related
        .filter((l) => l.status === "open")
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    };
  });
}

export async function getContact(id: string): Promise<ContactWithCompany | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(id, name, domain)")
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

export async function getCompanies(search?: string): Promise<
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
  let q = supabase.from("companies").select("*");
  if (search) {
    const term = `%${search}%`;
    q = q.or(`name.ilike.${term},domain.ilike.${term},industry.ilike.${term}`);
  }

  const { data, error } = await q.order("name");
  if (error) throw error;

  const [{ data: contactRows }, { data: leadRows }] = await Promise.all([
    supabase.from("contacts").select("company_id"),
    supabase.from("leads").select("company_id, value, status"),
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

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Company) ?? null;
}

export async function getCompanyContacts(
  companyId: string,
): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

// -------------------------------------------------------------- activities

export async function getActivities(filter: {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  limit?: number;
}): Promise<Activity[]> {
  const supabase = await createClient();
  let q = supabase.from("activities").select("*");

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

export async function getCompanyOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function getContactOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, company_id")
    .order("first_name");
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    company_id: string | null;
  }>;
}

// ------------------------------------------------------------ counts/misc

export async function getCounts() {
  const supabase = await createClient();
  const [contacts, companies, leads] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
  ]);
  return {
    contacts: contacts.count ?? 0,
    companies: companies.count ?? 0,
    leads: leads.count ?? 0,
  };
}
