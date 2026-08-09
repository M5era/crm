export type LeadStatus = "open" | "won" | "lost";
export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

/**
 * A separate business. Every record below belongs to exactly one workspace and
 * is invisible from the others — there is no cross-workspace view by design.
 */
export type Workspace = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  position: number;
  created_at: string;
};

export type Stage = {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  description: string | null;
  position: number;
  color: string;
  is_won: boolean;
};

export type Company = {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Lifecycle =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "unqualified"
  | "customer";

export type Contact = {
  id: string;
  workspace_id: string;
  lifecycle: Lifecycle;
  last_contacted_at: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  linkedin: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  workspace_id: string;
  title: string;
  company_id: string | null;
  contact_id: string | null;
  stage_id: string;
  value: number;
  status: LeadStatus;
  source: string | null;
  owner: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type Activity = {
  id: string;
  workspace_id: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  lead_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  author: string | null;
  created_at: string;
};

export type StageEvent = {
  id: string;
  lead_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  created_at: string;
};

/** Shapes returned by the joined selects in lib/queries.ts. */
export type CompanyRef = Pick<Company, "id" | "name" | "domain"> | null;
export type ContactRef = Pick<
  Contact,
  "id" | "first_name" | "last_name" | "email" | "title"
> | null;

export type LeadWithRelations = Lead & {
  stage: Stage;
  company: CompanyRef;
  contact: ContactRef;
};

export type ContactWithCompany = Contact & { company: CompanyRef };

export type ActivityWithRelations = Activity & {
  lead: Pick<Lead, "id" | "title"> | null;
  contact: ContactRef;
  company: CompanyRef;
};

export const ACTIVITY_TYPES: ActivityType[] = [
  "note",
  "call",
  "email",
  "meeting",
  "task",
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  task: "Task",
};

export const LEAD_SOURCES = [
  "Cold outreach",
  "Referral",
  "Inbound — website",
  "LinkedIn",
  "Event / conference",
  "Paid ads",
  "Partner",
  "Other",
];

export const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Agency / services",
  "Finance",
  "Healthcare",
  "Real estate",
  "Education",
  "Manufacturing",
  "Media",
  "Hospitality",
  "Other",
];

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

export type ApiKey = {
  id: string;
  workspace_id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type ImportRun = {
  id: string;
  workspace_id: string;
  source: string;
  entity: string;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }> | null;
  author: string | null;
  created_at: string;
};

/**
 * Where a person sits in the outreach funnel. This is deliberately separate
 * from the deal pipeline: a thousand cold contacts live here without ever
 * appearing on the board. A deal is created only once someone replies.
 */
export const LIFECYCLES: Array<{
  value: Lifecycle;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: "new",
    label: "New",
    description: "Imported, not yet contacted.",
    color: "#6b7285",
  },
  {
    value: "contacted",
    label: "Contacted",
    description: "Outreach sent, no response yet.",
    color: "#2a78d6",
  },
  {
    value: "replied",
    label: "Replied",
    description: "Responded — worth a real conversation.",
    color: "#3987e5",
  },
  {
    value: "qualified",
    label: "Qualified",
    description: "A genuine opportunity. Usually has a deal.",
    color: "#199e70",
  },
  {
    value: "unqualified",
    label: "Unqualified",
    description: "Not a fit, or asked not to be contacted.",
    color: "#6b7285",
  },
  {
    value: "customer",
    label: "Customer",
    description: "Has bought.",
    color: "#0ca30c",
  },
];

export function lifecycleMeta(value: string) {
  return LIFECYCLES.find((l) => l.value === value) ?? LIFECYCLES[0];
}
