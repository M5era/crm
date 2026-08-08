import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContact } from "@/app/actions";
import {
  getActivities,
  getCompanyOptions,
  getContact,
  getContactOptions,
  getLeads,
  getStages,
} from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import { ActivityTimeline } from "@/components/activity-timeline";
import {
  EditContactDialog,
  NewActivityDialog,
  NewLeadDialog,
} from "@/components/dialogs";
import { LeadList } from "@/components/lead-list";
import { LinkIcon, MailIcon, PhoneIcon, TrashIcon } from "@/components/icons";
import { Avatar, DetailRow, PageHeader, Section, StatCard } from "@/components/ui";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const contact = await getContact(workspace.id, id);
  return {
    title: contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : "Contact",
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const contact = await getContact(workspace.id, id);
  if (!contact) notFound();

  const [leads, activities, companies, contacts, stages] = await Promise.all([
    getLeads(workspace.id, { contactId: id }),
    getActivities(workspace.id, { contactId: id }),
    getCompanyOptions(workspace.id),
    getContactOptions(workspace.id),
    getStages(workspace.id),
  ]);

  const name = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ");
  const openValue = leads
    .filter((l) => l.status === "open")
    .reduce((s, l) => s + l.value, 0);
  const wonValue = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + l.value, 0);

  const linkedinHref = contact.linkedin
    ? contact.linkedin.startsWith("http")
      ? contact.linkedin
      : `https://${contact.linkedin}`
    : null;

  return (
    <>
      <PageHeader
        title={name}
        subtitle={
          [contact.title, contact.company?.name].filter(Boolean).join(" · ") ||
          "No title or company set"
        }
        actions={
          <>
            <NewActivityDialog workspaceId={workspace.id} contactId={contact.id} />
            <EditContactDialog contact={contact} companies={companies} />
            <form action={deleteContact}>
              <input type="hidden" name="id" value={contact.id} />
              <input
                type="hidden"
                name="workspace_slug"
                value={workspace.slug}
              />
              <button
                type="submit"
                className="btn btn-danger"
                aria-label="Delete contact"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Deals" value={String(leads.length)} />
            <StatCard
              label="Open value"
              value={money(openValue)}
              accent="brand"
            />
            <StatCard
              label="Won value"
              value={money(wonValue)}
              accent="positive"
            />
          </div>

          <Section
            title="Deals"
            description="Every lead this person is attached to."
            actions={
              <NewLeadDialog
                workspaceId={workspace.id}
                stages={stages}
                companies={companies}
                contacts={contacts}
                defaultContactId={contact.id}
                defaultCompanyId={contact.company_id ?? undefined}
                label="New deal"
                triggerClassName="btn btn-ghost"
              />
            }
          >
            <LeadList
              workspaceSlug={workspace.slug}
              leads={leads}
              showCompany
              emptyTitle="No deals for this contact"
              emptyDescription="Create a deal to start tracking them in the pipeline."
              action={
                <NewLeadDialog
                  workspaceId={workspace.id}
                  stages={stages}
                  companies={companies}
                  contacts={contacts}
                  defaultContactId={contact.id}
                  defaultCompanyId={contact.company_id ?? undefined}
                  label="New deal"
                />
              }
            />
          </Section>

          {contact.notes && (
            <Section title="Notes">
              <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink-muted">
                {contact.notes}
              </p>
            </Section>
          )}

          <Section
            title="Activity"
            actions={<NewActivityDialog workspaceId={workspace.id} contactId={contact.id} />}
          >
            <ActivityTimeline activities={activities} />
          </Section>
        </div>

        <div className="space-y-5">
          <div className="card flex flex-col items-center px-4 py-6 text-center">
            <Avatar name={name} size={64} />
            <p className="mt-3 text-sm font-semibold">{name}</p>
            {contact.title && (
              <p className="text-xs text-ink-muted">{contact.title}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="btn btn-ghost"
                  title={contact.email}
                >
                  <MailIcon className="h-4 w-4" />
                  Email
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="btn btn-ghost">
                  <PhoneIcon className="h-4 w-4" />
                  Call
                </a>
              )}
              {linkedinHref && (
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-ghost"
                >
                  <LinkIcon className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          <Section title="Details">
            <div className="divide-y divide-line-soft">
              <DetailRow label="Email">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all text-brand-soft hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Phone">{contact.phone ?? "—"}</DetailRow>
              <DetailRow label="Company">
                {contact.company ? (
                  <Link
                    href={`/${workspace.slug}/companies/${contact.company.id}`}
                    className="text-brand-soft hover:underline"
                  >
                    {contact.company.name}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Source">
                {contact.source ?? "Unattributed"}
              </DetailRow>
              <DetailRow label="Added">
                {formatDate(contact.created_at)}
              </DetailRow>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
