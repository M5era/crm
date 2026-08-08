import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCompany } from "@/app/actions";
import {
  getActivities,
  getCompany,
  getCompanyContacts,
  getCompanyOptions,
  getContactOptions,
  getLeads,
  getStages,
} from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import { ActivityTimeline } from "@/components/activity-timeline";
import {
  EditCompanyDialog,
  NewActivityDialog,
  NewContactDialog,
  NewLeadDialog,
} from "@/components/dialogs";
import { LeadList } from "@/components/lead-list";
import { ContactsIcon, LinkIcon, TrashIcon } from "@/components/icons";
import {
  Avatar,
  DetailRow,
  EmptyState,
  PageHeader,
  Section,
  StatCard,
} from "@/components/ui";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const company = await getCompany(workspace.id, id);
  return { title: company?.name ?? "Company" };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const company = await getCompany(workspace.id, id);
  if (!company) notFound();

  const [leads, contacts, activities, companies, contactOptions, stages] =
    await Promise.all([
      getLeads(workspace.id, { companyId: id }),
      getCompanyContacts(workspace.id, id),
      getActivities(workspace.id, { companyId: id }),
      getCompanyOptions(workspace.id),
      getContactOptions(workspace.id),
      getStages(workspace.id),
    ]);

  const openValue = leads
    .filter((l) => l.status === "open")
    .reduce((s, l) => s + l.value, 0);
  const wonValue = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + l.value, 0);

  const websiteHref = company.website
    ? company.website.startsWith("http")
      ? company.website
      : `https://${company.website}`
    : company.domain
      ? `https://${company.domain}`
      : null;

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={
          [company.industry, company.size && `${company.size} employees`, company.location]
            .filter(Boolean)
            .join(" · ") || "No profile details yet"
        }
        actions={
          <>
            <NewActivityDialog workspaceId={workspace.id} companyId={company.id} />
            <EditCompanyDialog company={company} />
            <form action={deleteCompany}>
              <input type="hidden" name="id" value={company.id} />
              <input
                type="hidden"
                name="workspace_slug"
                value={workspace.slug}
              />
              <button
                type="submit"
                className="btn btn-danger"
                aria-label="Delete company"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Contacts" value={String(contacts.length)} />
            <StatCard label="Deals" value={String(leads.length)} />
            <StatCard
              label="Open value"
              value={money(openValue)}
              accent="brand"
            />
            <StatCard
              label="Won revenue"
              value={money(wonValue)}
              accent="positive"
            />
          </div>

          {company.description && (
            <Section title="About">
              <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink-muted">
                {company.description}
              </p>
            </Section>
          )}

          <Section
            title="Deals"
            actions={
              <NewLeadDialog
                workspaceId={workspace.id}
                stages={stages}
                companies={companies}
                contacts={contactOptions}
                defaultCompanyId={company.id}
                label="New deal"
                triggerClassName="btn btn-ghost"
              />
            }
          >
            <LeadList
              workspaceSlug={workspace.slug}
              leads={leads}
              emptyTitle="No deals with this company"
              emptyDescription="Create a deal to start tracking it in the pipeline."
              action={
                <NewLeadDialog
                  workspaceId={workspace.id}
                  stages={stages}
                  companies={companies}
                  contacts={contactOptions}
                  defaultCompanyId={company.id}
                  label="New deal"
                />
              }
            />
          </Section>

          <Section
            title="People"
            actions={
              <NewContactDialog
                workspaceId={workspace.id}
                companies={companies}
                defaultCompanyId={company.id}
                label="New contact"
                triggerClassName="btn btn-ghost"
              />
            }
          >
            {contacts.length === 0 ? (
              <EmptyState
                icon={<ContactsIcon className="h-5 w-5" />}
                title="No contacts here yet"
                description="Add the people you speak to at this company."
                action={
                  <NewContactDialog
                    workspaceId={workspace.id}
                    companies={companies}
                    defaultCompanyId={company.id}
                    label="New contact"
                  />
                }
              />
            ) : (
              <ul className="divide-y divide-line-soft">
                {contacts.map((contact) => {
                  const name = [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li key={contact.id}>
                      <Link
                        href={`/${workspace.slug}/contacts/${contact.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60"
                      >
                        <Avatar name={name} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {name}
                          </p>
                          <p className="truncate text-xs text-ink-faint">
                            {contact.title ?? contact.email ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section
            title="Activity"
            actions={<NewActivityDialog workspaceId={workspace.id} companyId={company.id} />}
          >
            <ActivityTimeline activities={activities} />
          </Section>
        </div>

        <div className="space-y-5">
          <div className="card flex flex-col items-center px-4 py-6 text-center">
            <Avatar name={company.name} size={64} color="#22d3ee" />
            <p className="mt-3 text-sm font-semibold">{company.name}</p>
            {company.domain && (
              <p className="text-xs text-ink-muted">{company.domain}</p>
            )}
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-ghost mt-4"
              >
                <LinkIcon className="h-4 w-4" />
                Visit website
              </a>
            )}
          </div>

          <Section title="Details">
            <div className="divide-y divide-line-soft">
              <DetailRow label="Industry">{company.industry ?? "—"}</DetailRow>
              <DetailRow label="Headcount">
                {company.size ? `${company.size} employees` : "—"}
              </DetailRow>
              <DetailRow label="Location">{company.location ?? "—"}</DetailRow>
              <DetailRow label="Domain">{company.domain ?? "—"}</DetailRow>
              <DetailRow label="Added">
                {formatDate(company.created_at)}
              </DetailRow>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
