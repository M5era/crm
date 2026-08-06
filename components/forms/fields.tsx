import { COMPANY_SIZES, INDUSTRIES, LEAD_SOURCES } from "@/lib/types";
import type { Company, Contact, Lead, Stage } from "@/lib/types";
import { FieldRow } from "@/components/form-dialog";

export type CompanyOption = { id: string; name: string };
export type ContactOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_id: string | null;
};

function Select({
  name,
  label,
  defaultValue,
  options,
  placeholder = "—",
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Text({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required,
  step,
  min,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="resize-y"
      />
    </div>
  );
}

const sourceOptions = LEAD_SOURCES.map((s) => ({ value: s, label: s }));

// -------------------------------------------------------------- lead fields

export function LeadFields({
  lead,
  stages,
  companies,
  contacts,
  defaultStageId,
  defaultCompanyId,
  defaultContactId,
}: {
  lead?: Lead;
  stages: Stage[];
  companies: CompanyOption[];
  contacts: ContactOption[];
  defaultStageId?: string;
  defaultCompanyId?: string;
  defaultContactId?: string;
}) {
  return (
    <>
      {lead && <input type="hidden" name="id" value={lead.id} />}

      <Text
        name="title"
        label="Deal name"
        required
        defaultValue={lead?.title}
        placeholder="e.g. Q3 automation retainer"
      />

      <FieldRow>
        <Select
          name="company_id"
          label="Company"
          defaultValue={lead?.company_id ?? defaultCompanyId}
          placeholder="No company"
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          name="contact_id"
          label="Primary contact"
          defaultValue={lead?.contact_id ?? defaultContactId}
          placeholder="No contact"
          options={contacts.map((c) => ({
            value: c.id,
            label: [c.first_name, c.last_name].filter(Boolean).join(" "),
          }))}
        />
      </FieldRow>

      <FieldRow>
        <Select
          name="stage_id"
          label="Stage"
          required
          defaultValue={lead?.stage_id ?? defaultStageId ?? stages[0]?.id}
          placeholder="Select a stage"
          options={stages.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Text
          name="value"
          label="Deal value (USD)"
          type="number"
          min="0"
          step="100"
          defaultValue={lead?.value ? String(lead.value) : ""}
          placeholder="0"
        />
      </FieldRow>

      <FieldRow>
        <Select
          name="source"
          label="Source"
          defaultValue={lead?.source}
          placeholder="Unattributed"
          options={sourceOptions}
        />
        <Text
          name="owner"
          label="Owner"
          defaultValue={lead?.owner}
          placeholder="Who runs this deal?"
        />
      </FieldRow>

      <Text
        name="expected_close_date"
        label="Expected close date"
        type="date"
        defaultValue={lead?.expected_close_date}
      />

      <Textarea
        name="notes"
        label="Notes"
        defaultValue={lead?.notes}
        placeholder="Context, requirements, next steps…"
      />
    </>
  );
}

// ----------------------------------------------------------- contact fields

export function ContactFields({
  contact,
  companies,
  defaultCompanyId,
}: {
  contact?: Contact;
  companies: CompanyOption[];
  defaultCompanyId?: string;
}) {
  return (
    <>
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <FieldRow>
        <Text
          name="first_name"
          label="First name"
          required
          defaultValue={contact?.first_name}
          placeholder="Jane"
        />
        <Text
          name="last_name"
          label="Last name"
          defaultValue={contact?.last_name}
          placeholder="Doe"
        />
      </FieldRow>

      <FieldRow>
        <Text
          name="email"
          label="Email"
          type="email"
          defaultValue={contact?.email}
          placeholder="jane@company.com"
        />
        <Text
          name="phone"
          label="Phone"
          defaultValue={contact?.phone}
          placeholder="+1 555 000 0000"
        />
      </FieldRow>

      <FieldRow>
        <Text
          name="title"
          label="Job title"
          defaultValue={contact?.title}
          placeholder="Head of Growth"
        />
        <Select
          name="company_id"
          label="Company"
          defaultValue={contact?.company_id ?? defaultCompanyId}
          placeholder="No company"
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FieldRow>

      <FieldRow>
        <Text
          name="linkedin"
          label="LinkedIn"
          defaultValue={contact?.linkedin}
          placeholder="linkedin.com/in/…"
        />
        <Select
          name="source"
          label="Source"
          defaultValue={contact?.source}
          placeholder="Unattributed"
          options={sourceOptions}
        />
      </FieldRow>

      <Textarea
        name="notes"
        label="Notes"
        defaultValue={contact?.notes}
        placeholder="How you met, what they care about…"
      />
    </>
  );
}

// ----------------------------------------------------------- company fields

export function CompanyFields({ company }: { company?: Company }) {
  return (
    <>
      {company && <input type="hidden" name="id" value={company.id} />}

      <Text
        name="name"
        label="Company name"
        required
        defaultValue={company?.name}
        placeholder="Acme Inc."
      />

      <FieldRow>
        <Text
          name="domain"
          label="Domain"
          defaultValue={company?.domain}
          placeholder="acme.com"
        />
        <Text
          name="website"
          label="Website"
          defaultValue={company?.website}
          placeholder="https://acme.com"
        />
      </FieldRow>

      <FieldRow>
        <Select
          name="industry"
          label="Industry"
          defaultValue={company?.industry}
          options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
        />
        <Select
          name="size"
          label="Headcount"
          defaultValue={company?.size}
          options={COMPANY_SIZES.map((s) => ({
            value: s,
            label: `${s} employees`,
          }))}
        />
      </FieldRow>

      <Text
        name="location"
        label="Location"
        defaultValue={company?.location}
        placeholder="Berlin, Germany"
      />

      <Textarea
        name="description"
        label="Description"
        defaultValue={company?.description}
        placeholder="What they do, why they are a fit…"
      />
    </>
  );
}

// ---------------------------------------------------------- activity fields

export function ActivityFields({
  leadId,
  contactId,
  companyId,
}: {
  leadId?: string;
  contactId?: string;
  companyId?: string;
}) {
  return (
    <>
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}

      <FieldRow>
        <Select
          name="type"
          label="Type"
          defaultValue="note"
          placeholder="Note"
          options={[
            { value: "note", label: "Note" },
            { value: "call", label: "Call" },
            { value: "email", label: "Email" },
            { value: "meeting", label: "Meeting" },
            { value: "task", label: "Task" },
          ]}
        />
        <Text
          name="subject"
          label="Summary"
          required
          placeholder="Discovery call booked"
        />
      </FieldRow>

      <Textarea
        name="body"
        label="Details"
        rows={5}
        placeholder="What happened, what is next…"
      />
    </>
  );
}
