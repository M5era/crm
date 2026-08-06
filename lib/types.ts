export type LeadStatus = "open" | "won" | "lost";
export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

export type Stage = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  position: number;
  color: string;
  is_won: boolean;
};

export type Company = {
  id: string;
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

export type Contact = {
  id: string;
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
