import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead } from "@/app/actions";
import {
  getActivities,
  getCompanyOptions,
  getContactOptions,
  getLead,
  getLeadStageHistory,
  getStages,
} from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import { ActivityTimeline } from "@/components/activity-timeline";
import { EditLeadDialog, NewActivityDialog } from "@/components/dialogs";
import { LeadStageControl } from "@/components/lead-stage-control";
import { TrashIcon } from "@/components/icons";
import {
  DetailRow,
  PageHeader,
  Section,
  StatusBadge,
} from "@/components/ui";
import {
  formatDate,
  formatDateTime,
  fullName,
  money,
  relativeTime,
} from "@/lib/format";
import { stageColor } from "@/lib/viz";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const lead = await getLead(workspace.id, id);
  return { title: lead?.title ?? "Lead" };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const workspace = await requireWorkspace(slug);
  const lead = await getLead(workspace.id, id);
  if (!lead) notFound();

  const [stages, activities, history, companies, contacts] = await Promise.all([
    getStages(workspace.id),
    getActivities(workspace.id, { leadId: id }),
    getLeadStageHistory(id),
    getCompanyOptions(workspace.id),
    getContactOptions(workspace.id),
  ]);

  const contactName = fullName(lead.contact);

  return (
    <>
      <PageHeader
        title={lead.title}
        subtitle={
          lead.company
            ? `${lead.company.name}${contactName ? ` · ${contactName}` : ""}`
            : (contactName ?? "No company or contact linked")
        }
        actions={
          <>
            <NewActivityDialog workspaceId={workspace.id} leadId={lead.id} />
            <EditLeadDialog
              lead={lead}
              stages={stages}
              companies={companies}
              contacts={contacts}
            />
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <input
                type="hidden"
                name="workspace_slug"
                value={workspace.slug}
              />
              <button
                type="submit"
                className="btn btn-danger"
                aria-label="Delete lead"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <LeadStageControl
            leadId={lead.id}
            stages={stages}
            currentStageId={lead.stage_id}
            status={lead.status}
          />

          {lead.notes && (
            <Section title="Notes">
              <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-ink-muted">
                {lead.notes}
              </p>
            </Section>
          )}

          <Section
            title="Activity"
            description="Everything logged against this deal."
            actions={<NewActivityDialog workspaceId={workspace.id} leadId={lead.id} />}
          >
            <ActivityTimeline activities={activities} />
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Deal">
            <div className="divide-y divide-line-soft">
              <DetailRow label="Value">
                <span className="font-semibold">{money(lead.value)}</span>
              </DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={lead.status} />
              </DetailRow>
              <DetailRow label="Stage">{lead.stage?.name ?? "—"}</DetailRow>
              <DetailRow label="Owner">{lead.owner ?? "Unassigned"}</DetailRow>
              <DetailRow label="Source">
                {lead.source ?? "Unattributed"}
              </DetailRow>
              <DetailRow label="Expected close">
                {formatDate(lead.expected_close_date)}
              </DetailRow>
              {lead.closed_at && (
                <DetailRow label="Closed">
                  {formatDate(lead.closed_at)}
                </DetailRow>
              )}
              <DetailRow label="Created">
                {formatDate(lead.created_at)}
              </DetailRow>
              <DetailRow label="Last update">
                {relativeTime(lead.updated_at)}
              </DetailRow>
            </div>
          </Section>

          <Section title="Related">
            <div className="divide-y divide-line-soft">
              <DetailRow label="Company">
                {lead.company ? (
                  <Link
                    href={`/${workspace.slug}/companies/${lead.company.id}`}
                    className="text-brand-soft hover:underline"
                  >
                    {lead.company.name}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Contact">
                {lead.contact ? (
                  <Link
                    href={`/${workspace.slug}/contacts/${lead.contact.id}`}
                    className="text-brand-soft hover:underline"
                  >
                    {contactName}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              {lead.contact?.email && (
                <DetailRow label="Email">
                  <a
                    href={`mailto:${lead.contact.email}`}
                    className="text-brand-soft hover:underline"
                  >
                    {lead.contact.email}
                  </a>
                </DetailRow>
              )}
            </div>
          </Section>

          <Section
            title="Stage history"
            description="Every move, newest last."
          >
            {history.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-faint">No moves yet.</p>
            ) : (
              <ol className="space-y-3 px-4 py-4">
                {history.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: stageColor(event.to_stage) }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-ink">
                        {event.from_stage
                          ? `${event.from_stage.name} → ${event.to_stage.name}`
                          : `Created in ${event.to_stage.name}`}
                      </p>
                      <p
                        className="text-[11px] text-ink-faint"
                        title={formatDateTime(event.created_at)}
                      >
                        {relativeTime(event.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
