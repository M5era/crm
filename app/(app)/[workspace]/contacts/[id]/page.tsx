import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContact } from "@/app/actions";
import {
  getActivities,
  getCompanyOptions,
  getContact,
  getContactEmails,
  getLeads,
  getStages,
} from "@/lib/queries";
import { classificationMeta } from "@/lib/types";
import { requireWorkspace } from "@/lib/workspace";
import { ActivityTimeline } from "@/components/activity-timeline";
import {
  ConvertContactDialog,
  EditContactDialog,
  NewActivityDialog,
} from "@/components/dialogs";
import { LifecycleSelect } from "@/components/lifecycle";
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

  const [leads, activities, companies, stages, emails] = await Promise.all([
    getLeads(workspace.id, { contactId: id }),
    getActivities(workspace.id, { contactId: id }),
    getCompanyOptions(workspace.id),
    getStages(workspace.id),
    getContactEmails(workspace.id, id),
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
              <ConvertContactDialog
                workspaceId={workspace.id}
                contact={contact}
                stages={stages}
                triggerClassName="btn btn-ghost"
              />
            }
          >
            <LeadList
              workspaceSlug={workspace.slug}
              leads={leads}
              showCompany
              emptyTitle="Not in the pipeline yet"
              emptyDescription="Cold contacts stay off the board. Create a deal once there is a real conversation to track."
              action={
                <ConvertContactDialog
                  workspaceId={workspace.id}
                  contact={contact}
                  stages={stages}
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

          {emails.length > 0 && (
            <Section
              title="Email"
              description="What we sent, and what came back."
            >
              <ul className="divide-y divide-line-soft">
                {emails.map((email) => {
                  const inbound = email.direction === "inbound";
                  const meta = classificationMeta(email.classification);
                  return (
                    <li key={email.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="chip"
                          style={
                            inbound
                              ? {
                                  backgroundColor: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
                                  color: meta.color,
                                }
                              : undefined
                          }
                        >
                          {inbound ? meta.singular : "Sent"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {email.subject ?? "(no subject)"}
                        </span>
                        <span className="shrink-0 text-xs text-ink-faint">
                          {formatDate(email.occurred_at)}
                        </span>
                      </div>
                      {inbound && email.body && (
                        <p className="mt-1 line-clamp-3 text-xs text-ink-faint">
                          {email.body.slice(0, 400)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
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

          <Section
            title="Outreach status"
            description="Where this person sits in the funnel — separate from any deal."
          >
            <div className="px-4 py-4">
              <LifecycleSelect
                contactId={contact.id}
                value={contact.lifecycle}
              />
            </div>
          </Section>

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
              <DetailRow label="Last contacted">
                {contact.last_contacted_at
                  ? formatDate(contact.last_contacted_at)
                  : "Never"}
              </DetailRow>
              <DetailRow label="Last reply">
                {contact.last_reply_at
                  ? formatDate(contact.last_reply_at)
                  : "None"}
              </DetailRow>
              {/* Two facts that must survive whatever the lifecycle says: a
                  dead address and an explicit opt-out are reasons never to
                  mail this person again. */}
              {contact.bounced_at && (
                <DetailRow label="Bounced">
                  <span className="text-negative">
                    {formatDate(contact.bounced_at)}
                  </span>
                </DetailRow>
              )}
              {contact.unsubscribed_at && (
                <DetailRow label="Opted out">
                  <span className="text-warning">
                    {formatDate(contact.unsubscribed_at)}
                  </span>
                </DetailRow>
              )}
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
