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

/**
 * Verdict on an email address, written by the external verification workflow
 * (n8n: syntax → MX → Verifalia) — never by this app. NULL and "unknown" both
 * mean unchecked: the workflow re-queues them on its next run.
 */
export type Verification =
  | "ok"
  | "role"
  | "risky"
  | "unknown"
  | "no_reply"
  | "disposable"
  | "no_mx"
  | "invalid_syntax"
  | "undeliverable";

export type Contact = {
  id: string;
  workspace_id: string;
  lifecycle: Lifecycle;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
  verification: Verification | null;
  verification_note: string | null;
  verified_at: string | null;
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

/**
 * Mail we sent, and mail that came back. Outbound rows exist so that inbound
 * rows can be matched by Message-ID rather than by guessing at the sender.
 */
export type EmailDirection = "outbound" | "inbound";

export type EmailClassification =
  | "human"
  | "auto_reply"
  | "bounce"
  | "unsubscribe";

export type MatchedBy = "message_id" | "email" | "none";

export type EmailMessage = {
  id: string;
  workspace_id: string;
  direction: EmailDirection;
  message_id: string;
  in_reply_to: string | null;
  reference_ids: string[];
  contact_id: string | null;
  lead_id: string | null;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  body: string | null;
  classification: EmailClassification | null;
  matched_by: MatchedBy | null;
  headers: Record<string, string> | null;
  occurred_at: string;
  created_at: string;
};

export type EmailMessageWithContact = EmailMessage & { contact: ContactRef };

/**
 * How each verdict reads in the UI. Auto-replies and bounces are shown rather
 * than hidden: knowing an address is dead is as useful as knowing someone
 * answered, and a silently dropped bounce is how a list rots.
 */
export const CLASSIFICATIONS: Array<{
  value: EmailClassification;
  /** Plural, for filter chips that carry a count. */
  label: string;
  /** Singular, for the badge on one message. */
  singular: string;
  description: string;
  color: string;
}> = [
  {
    value: "human",
    label: "Replies",
    singular: "Reply",
    description: "A person actually wrote back.",
    color: "#199e70",
  },
  {
    value: "auto_reply",
    label: "Auto-replies",
    singular: "Auto-reply",
    description: "Out-of-office or vacation responder. Not a signal.",
    color: "#6b7285",
  },
  {
    value: "bounce",
    label: "Bounces",
    singular: "Bounce",
    description: "Delivery failed — the address is bad.",
    color: "#d4562f",
  },
  {
    value: "unsubscribe",
    label: "Opt-outs",
    singular: "Opt-out",
    description: "Asked not to be contacted again.",
    color: "#b0812a",
  },
];

export function classificationMeta(value: string | null) {
  return (
    CLASSIFICATIONS.find((c) => c.value === value) ?? {
      value: "human" as EmailClassification,
      label: "Unknown",
      singular: "Unknown",
      description: "Unclassified message.",
      color: "#6b7285",
    }
  );
}

export const MATCHED_BY_LABELS: Record<MatchedBy, string> = {
  message_id: "Matched on thread",
  email: "Matched on address",
  none: "Unmatched",
};

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

/**
 * How each verification verdict reads in the UI. `mailable` is the one bit
 * the rest of the app cares about: whether a sequencer should spend a send
 * on this address.
 */
export const VERIFICATIONS: Array<{
  value: Verification;
  label: string;
  description: string;
  color: string;
  mailable: boolean;
}> = [
  {
    value: "ok",
    label: "Deliverable",
    description: "Mailbox confirmed — safe to send.",
    color: "#199e70",
    mailable: true,
  },
  {
    value: "role",
    label: "Role address",
    description: "Deliverable, but a shared mailbox (info@, kontakt@) — a person may never see it.",
    color: "#2a78d6",
    mailable: true,
  },
  {
    value: "risky",
    label: "Risky",
    description: "Deliverable on paper, dubious in practice — catch-all domain or full mailbox.",
    color: "#b0812a",
    mailable: false,
  },
  {
    value: "unknown",
    label: "Unverified",
    description: "Checks ran but could not decide. Will be retried automatically.",
    color: "#6b7285",
    mailable: false,
  },
  {
    value: "no_reply",
    label: "No-reply",
    description: "An unmonitored sender address — a reply would go nowhere.",
    color: "#b0812a",
    mailable: false,
  },
  {
    value: "disposable",
    label: "Disposable",
    description: "Throwaway domain. Not a real relationship.",
    color: "#d4562f",
    mailable: false,
  },
  {
    value: "no_mx",
    label: "No mail server",
    description: "The domain cannot receive mail at all.",
    color: "#d4562f",
    mailable: false,
  },
  {
    value: "invalid_syntax",
    label: "Invalid",
    description: "Not a parseable email address.",
    color: "#d4562f",
    mailable: false,
  },
  {
    value: "undeliverable",
    label: "Undeliverable",
    description: "Mailbox confirmed dead.",
    color: "#d4562f",
    mailable: false,
  },
];

export function verificationMeta(value: string) {
  return (
    VERIFICATIONS.find((v) => v.value === value) ?? {
      value: "unknown" as Verification,
      label: "Unverified",
      description: "Not checked yet.",
      color: "#6b7285",
      mailable: false,
    }
  );
}
