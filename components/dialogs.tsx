import {
  createActivity,
  createCompany,
  createContact,
  createLead,
  updateCompany,
  updateContact,
  updateLead,
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
import type { Company, Contact, Lead, Stage } from "@/lib/types";

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
