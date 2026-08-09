import {
  createActivity,
  createApiKey,
  createCompany,
  createContact,
  createLead,
  createStage,
  convertContactToDeal,
  createWorkspace,
  importCsv,
  updateCompany,
  updateContact,
  updateLead,
  updateStage,
  updateWorkspace,
} from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import {
  ActivityFields,
  CompanyFields,
  ContactFields,
  LeadFields,
  type CompanyOption,
  type ContactOption,
} from "@/components/forms/fields";
import { NoteIcon, PlusIcon } from "@/components/icons";
import {
  LEAD_SOURCES,
  type Company,
  type Contact,
  type Lead,
  type Stage,
  type Workspace,
} from "@/lib/types";

// --------------------------------------------------------------------- lead

export function NewLeadDialog({
  workspaceId,
  stages,
  companies,
  contacts,
  defaultStageId,
  defaultCompanyId,
  defaultContactId,
  label = "New lead",
  triggerClassName = "btn btn-primary",
}: {
  workspaceId: string;
  stages: Stage[];
  companies: CompanyOption[];
  contacts: ContactOption[];
  defaultStageId?: string;
  defaultCompanyId?: string;
  defaultContactId?: string;
  label?: string;
  triggerClassName?: string;
}) {
  return (
    <FormDialog
      wide
      title="New lead"
      description="Add a deal to the pipeline."
      action={createLead}
      submitLabel="Create lead"
      triggerClassName={triggerClassName}
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          {label}
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <LeadFields
        stages={stages}
        companies={companies}
        contacts={contacts}
        defaultStageId={defaultStageId}
        defaultCompanyId={defaultCompanyId}
        defaultContactId={defaultContactId}
      />
    </FormDialog>
  );
}

export function EditLeadDialog({
  lead,
  stages,
  companies,
  contacts,
}: {
  lead: Lead;
  stages: Stage[];
  companies: CompanyOption[];
  contacts: ContactOption[];
}) {
  return (
    <FormDialog
      wide
      title="Edit lead"
      action={updateLead}
      submitLabel="Save changes"
      triggerClassName="btn btn-ghost"
      trigger="Edit"
    >
      <LeadFields
        lead={lead}
        stages={stages}
        companies={companies}
        contacts={contacts}
      />
    </FormDialog>
  );
}

// ------------------------------------------------------------------ contact

export function NewContactDialog({
  workspaceId,
  companies,
  defaultCompanyId,
  label = "New contact",
  triggerClassName = "btn btn-primary",
}: {
  workspaceId: string;
  companies: CompanyOption[];
  defaultCompanyId?: string;
  label?: string;
  triggerClassName?: string;
}) {
  return (
    <FormDialog
      wide
      title="New contact"
      description="Add a person to the CRM."
      action={createContact}
      submitLabel="Create contact"
      triggerClassName={triggerClassName}
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          {label}
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <ContactFields
        companies={companies}
        defaultCompanyId={defaultCompanyId}
      />
    </FormDialog>
  );
}

export function EditContactDialog({
  contact,
  companies,
}: {
  contact: Contact;
  companies: CompanyOption[];
}) {
  return (
    <FormDialog
      wide
      title="Edit contact"
      action={updateContact}
      submitLabel="Save changes"
      triggerClassName="btn btn-ghost"
      trigger="Edit"
    >
      <ContactFields contact={contact} companies={companies} />
    </FormDialog>
  );
}

// ------------------------------------------------------------------ company

export function NewCompanyDialog({
  workspaceId,
  label = "New company",
  triggerClassName = "btn btn-primary",
}: {
  workspaceId: string;
  label?: string;
  triggerClassName?: string;
}) {
  return (
    <FormDialog
      wide
      title="New company"
      description="Add an organisation to the CRM."
      action={createCompany}
      submitLabel="Create company"
      triggerClassName={triggerClassName}
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          {label}
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <CompanyFields />
    </FormDialog>
  );
}

export function EditCompanyDialog({ company }: { company: Company }) {
  return (
    <FormDialog
      wide
      title="Edit company"
      action={updateCompany}
      submitLabel="Save changes"
      triggerClassName="btn btn-ghost"
      trigger="Edit"
    >
      <CompanyFields company={company} />
    </FormDialog>
  );
}

// ----------------------------------------------------------------- activity

export function NewActivityDialog({
  workspaceId,
  leadId,
  contactId,
  companyId,
}: {
  workspaceId: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
}) {
  return (
    <FormDialog
      title="Log activity"
      description="Record a call, email, meeting or note."
      action={createActivity}
      submitLabel="Log activity"
      triggerClassName="btn btn-ghost"
      trigger={
        <>
          <NoteIcon className="h-4 w-4" />
          Log activity
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <ActivityFields
        leadId={leadId}
        contactId={contactId}
        companyId={companyId}
      />
    </FormDialog>
  );
}

// ---------------------------------------------------------------- workspace

export function NewWorkspaceDialog({
  triggerClassName = "btn btn-primary",
  label = "New workspace",
}: {
  triggerClassName?: string;
  label?: string;
}) {
  return (
    <FormDialog
      title="New workspace"
      description="A separate business, with its own contacts, deals and stages."
      action={createWorkspace}
      submitLabel="Create workspace"
      triggerClassName={triggerClassName}
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          {label}
        </>
      }
    >
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="Consulting" />
      </div>
      <div>
        <label htmlFor="slug">URL (optional)</label>
        <input id="slug" name="slug" placeholder="consulting" />
        <p className="mt-1.5 text-xs text-ink-faint">
          Leave blank to derive it from the name. Becomes /your-slug.
        </p>
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <input id="description" name="description" placeholder="What this business does" />
      </div>
      <div>
        <label htmlFor="accent">Accent colour</label>
        <input id="accent" name="accent" defaultValue="#7c6cff" placeholder="#7c6cff" />
      </div>
      <p className="text-xs text-ink-faint">
        It starts with a generic five-stage pipeline, editable straight away.
      </p>
    </FormDialog>
  );
}

export function EditWorkspaceDialog({ workspace }: { workspace: Workspace }) {
  return (
    <FormDialog
      title="Workspace settings"
      action={updateWorkspace}
      submitLabel="Save changes"
      triggerClassName="btn btn-ghost"
      trigger="Edit"
    >
      <input type="hidden" name="id" value={workspace.id} />
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={workspace.name} />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          defaultValue={workspace.description ?? ""}
        />
      </div>
      <div>
        <label htmlFor="accent">Accent colour</label>
        <input id="accent" name="accent" defaultValue={workspace.accent} />
      </div>
      <p className="text-xs text-ink-faint">
        The URL (/{workspace.slug}) cannot change — existing links would break.
      </p>
    </FormDialog>
  );
}

// -------------------------------------------------------------------- stage

export function NewStageDialog({ workspaceId }: { workspaceId: string }) {
  return (
    <FormDialog
      title="Add stage"
      description="It joins the end of the pipeline; reorder it afterwards."
      action={createStage}
      submitLabel="Add stage"
      triggerClassName="btn btn-ghost"
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          Add stage
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="Negotiation" />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          placeholder="What it means for a deal to sit here"
        />
      </div>
    </FormDialog>
  );
}

export function EditStageDialog({
  stage,
  workspaceId,
}: {
  stage: Stage;
  workspaceId: string;
}) {
  return (
    <FormDialog
      title={`Edit "${stage.name}"`}
      action={updateStage}
      submitLabel="Save changes"
      triggerClassName="text-xs text-ink-muted hover:text-ink"
      trigger="Edit"
    >
      <input type="hidden" name="id" value={stage.id} />
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={stage.name} />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          defaultValue={stage.description ?? ""}
        />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="is_won"
          defaultChecked={stage.is_won}
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ width: "1rem", padding: 0 }}
        />
        <span>
          Reaching this stage wins the deal
          <span className="mt-0.5 block text-xs text-ink-faint">
            Its value counts as revenue and the deal is stamped closed. Only one
            stage can be the winning one.
          </span>
        </span>
      </label>
    </FormDialog>
  );
}

// ------------------------------------------------------------------ api key

export function NewApiKeyDialog({ workspaceId }: { workspaceId: string }) {
  return (
    <FormDialog
      title="Create API key"
      description="Grants read and write access to this workspace only."
      action={createApiKey}
      submitLabel="Create key"
      triggerClassName="btn btn-ghost"
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          New key
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <div>
        <label htmlFor="name">What will use this key?</label>
        <input id="name" name="name" required placeholder="n8n — reply handler" />
      </div>
      <p className="text-xs text-ink-faint">
        The token is shown once, immediately after creation. Only a hash is
        stored, so it cannot be shown again.
      </p>
    </FormDialog>
  );
}

// ------------------------------------------------------------------- import

export function ImportDialog({
  workspaceId,
  entity,
}: {
  workspaceId: string;
  entity: "contacts" | "companies";
}) {
  const isContacts = entity === "contacts";
  return (
    <FormDialog
      wide
      title={`Import ${entity}`}
      description="Upload a CSV, or paste rows straight from a spreadsheet."
      action={importCsv}
      submitLabel="Import"
      triggerClassName="btn btn-ghost"
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          Import CSV
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="entity" value={entity} />

      <div>
        <label htmlFor="file">CSV file</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" />
      </div>

      <div>
        <label htmlFor="csv">…or paste rows</label>
        <textarea
          id="csv"
          name="csv"
          rows={6}
          placeholder={
            isContacts
              ? "First Name,Last Name,Email,Company,Title\nJane,Doe,jane@acme.com,Acme Inc.,Head of Growth"
              : "Name,Domain,Industry,Location\nAcme Inc.,acme.com,SaaS,Berlin"
          }
          className="resize-y font-mono text-xs"
        />
      </div>

      <div className="rounded-lg border border-line-soft bg-surface-2 p-3">
        <p className="text-xs font-medium text-ink">Column names are flexible</p>
        <p className="mt-1 text-xs text-ink-muted">
          {isContacts
            ? "“First Name”, “first_name” and “Given Name” all map to the same field. Recognised: first/last name, email, phone, title, company, linkedin, source, notes, lifecycle. Unknown columns are ignored."
            : "Recognised: name, domain, website, industry, size, location, description. Unknown columns are ignored."}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          {isContacts
            ? "Email is the identity — re-importing the same list updates people instead of duplicating them. Companies named here are created if they do not exist. Imported people start as “New”; none of them touch the deal pipeline."
            : "Name is the identity — re-importing updates rather than duplicating."}
        </p>
      </div>
    </FormDialog>
  );
}

/**
 * Promote a contact into the pipeline — what Salesforce calls lead conversion.
 * This is the only route from "someone I emailed" to "a deal on the board",
 * which is what keeps a thousand cold contacts off it.
 */
export function ConvertContactDialog({
  workspaceId,
  contact,
  stages,
  triggerClassName = "btn btn-primary",
}: {
  workspaceId: string;
  contact: Contact & { company?: { name: string } | null };
  stages: Stage[];
  triggerClassName?: string;
}) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const suggested = contact.company?.name
    ? `${contact.company.name} — new deal`
    : `${name} — new deal`;

  return (
    <FormDialog
      wide
      title="Create a deal"
      description={`Puts ${name} on the pipeline board and marks them qualified.`}
      action={convertContactToDeal}
      submitLabel="Create deal"
      triggerClassName={triggerClassName}
      trigger={
        <>
          <PlusIcon className="h-4 w-4" />
          New deal
        </>
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="contact_id" value={contact.id} />

      <div>
        <label htmlFor="title">Deal name</label>
        <input id="title" name="title" required defaultValue={suggested} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="stage_id">Stage</label>
          <select id="stage_id" name="stage_id" defaultValue={stages[0]?.id}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="value">Deal value (USD)</label>
          <input id="value" name="value" type="number" min="0" step="100" placeholder="0" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="source">Source</label>
          <select id="source" name="source" defaultValue={contact.source ?? ""}>
            <option value="">Unattributed</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="owner">Owner</label>
          <input id="owner" name="owner" placeholder="Who runs this deal?" />
        </div>
      </div>

      <div>
        <label htmlFor="expected_close_date">Expected close date</label>
        <input id="expected_close_date" name="expected_close_date" type="date" />
      </div>

      <div>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} className="resize-y" />
      </div>
    </FormDialog>
  );
}
