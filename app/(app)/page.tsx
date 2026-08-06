import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
import {
  getCompanyOptions,
  getContactOptions,
  getLeads,
  getRecentActivity,
  getStages,
} from "@/lib/queries";
import { HBarChart, type HBarRow } from "@/components/charts/h-bar-chart";
import {
  NewCompanyDialog,
  NewContactDialog,
  NewLeadDialog,
} from "@/components/dialogs";
import { LeadList } from "@/components/lead-list";
import { ArrowRightIcon, NoteIcon } from "@/components/icons";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { compactMoney, formatDate, money, percent, relativeTime } from "@/lib/format";
import { stageColor } from "@/lib/viz";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [analytics, openLeads, activity, stages, companies, contacts] =
    await Promise.all([
      getAnalytics(),
      getLeads({ status: "open" }),
      getRecentActivity(8),
      getStages(),
      getCompanyOptions(),
      getContactOptions(),
    ]);

  const isEmpty = analytics.totals.leads === 0;

  const closingSoon = openLeads
    .filter((lead) => lead.expected_close_date)
    .sort(
      (a, b) =>
        new Date(a.expected_close_date!).getTime() -
        new Date(b.expected_close_date!).getTime(),
    )
    .slice(0, 5);

  const stageRows: HBarRow[] = analytics.funnel.map((step) => ({
    key: step.stage.id,
    label: step.stage.name,
    value: step.current,
    display: `${step.current}`,
    color: stageColor(step.stage),
    caption: compactMoney(step.currentValue),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Where Inflate AI stands today."
        actions={
          <>
            <NewCompanyDialog
              label="Company"
              triggerClassName="btn btn-ghost"
            />
            <NewContactDialog
              companies={companies}
              label="Contact"
              triggerClassName="btn btn-ghost"
            />
            <NewLeadDialog
              stages={stages}
              companies={companies}
              contacts={contacts}
              label="New lead"
            />
          </>
        }
      />

      <div className="space-y-5 px-5 py-6 sm:px-8">
        {isEmpty && (
          <div className="card overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <h2 className="text-sm font-semibold">
                Your CRM is set up and empty — here is the fastest way in
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Three steps and the dashboard, pipeline and analytics all start
                filling in.
              </p>
            </div>
            <ol className="grid gap-px bg-line-soft sm:grid-cols-3">
              {[
                {
                  n: 1,
                  title: "Add a company",
                  body: "The organisation you are selling to.",
                },
                {
                  n: 2,
                  title: "Add a contact",
                  body: "The person you actually speak to there.",
                },
                {
                  n: 3,
                  title: "Create a lead",
                  body: "The deal itself — it lands in New Lead.",
                },
              ].map((step) => (
                <li key={step.n} className="bg-surface px-5 py-4">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-soft">
                    {step.n}
                  </span>
                  <p className="mt-2.5 text-sm font-medium text-ink">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open pipeline"
            value={money(analytics.money.openPipeline)}
            hint={`${analytics.totals.openLeads} active ${analytics.totals.openLeads === 1 ? "deal" : "deals"}`}
            accent="brand"
          />
          <StatCard
            label="Closed revenue"
            value={money(analytics.money.wonRevenue)}
            hint={`${analytics.totals.wonLeads} deals won all time`}
            accent="positive"
          />
          <StatCard
            label="New leads (30d)"
            value={String(analytics.rates.leadsLast30)}
            delta={analytics.rates.leadGrowth}
            hint="vs the previous 30 days"
          />
          <StatCard
            label="Win rate"
            value={
              analytics.rates.winRate !== null
                ? percent(analytics.rates.winRate)
                : "—"
            }
            hint={
              analytics.rates.winRate !== null
                ? `${analytics.totals.wonLeads} won vs ${analytics.totals.lostLeads} lost`
                : "No closed deals yet"
            }
            accent="warning"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Section
            title="Pipeline right now"
            description="Open deals sitting in each stage."
            actions={
              <Link
                href="/pipeline"
                className="flex items-center gap-1 text-xs text-brand-soft hover:underline"
              >
                Open board
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="px-4 py-4">
              {isEmpty ? (
                <EmptyState
                  title="No leads yet"
                  description="Create your first lead and it will show up here."
                  action={
                    <NewLeadDialog
                      stages={stages}
                      companies={companies}
                      contacts={contacts}
                    />
                  }
                />
              ) : (
                <HBarChart rows={stageRows} />
              )}
            </div>
          </Section>

          <Section
            title="Closing soon"
            description="Open deals with the nearest expected close date."
            actions={
              <Link
                href="/analytics"
                className="flex items-center gap-1 text-xs text-brand-soft hover:underline"
              >
                Analytics
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <LeadList
              leads={closingSoon}
              showCompany
              emptyTitle="Nothing scheduled to close"
              emptyDescription="Set an expected close date on a deal to see it here."
            />
          </Section>
        </div>

        <Section
          title="Recent activity"
          description="The latest calls, emails, meetings and notes."
        >
          {activity.length === 0 ? (
            <EmptyState
              icon={<NoteIcon className="h-5 w-5" />}
              title="No activity logged yet"
              description="Log a call, email or note on any lead, contact or company and it appears here."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {activity.map((item) => {
                const href = item.lead
                  ? `/leads/${item.lead.id}`
                  : item.contact
                    ? `/contacts/${item.contact.id}`
                    : item.company
                      ? `/companies/${item.company.id}`
                      : null;
                const context =
                  item.lead?.title ??
                  (item.contact
                    ? [item.contact.first_name, item.contact.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : (item.company?.name ?? "General"));

                const row = (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {item.subject}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {context}
                        {item.author ? ` · ${item.author}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {relativeTime(item.created_at)}
                    </span>
                  </div>
                );

                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="block transition-colors hover:bg-surface-2/60"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {analytics.velocity.stalledCount > 0 && (
          <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-negative">
                {analytics.velocity.stalledCount}
              </span>{" "}
              open {analytics.velocity.stalledCount === 1 ? "deal has" : "deals have"}{" "}
              had no update in 30 days.
            </p>
            <Link href="/pipeline" className="btn btn-ghost">
              Review pipeline
            </Link>
          </div>
        )}

        {closingSoon.length > 0 && (
          <p className="text-xs text-ink-faint">
            Next close date:{" "}
            {formatDate(closingSoon[0].expected_close_date)} ·{" "}
            {closingSoon[0].title}
          </p>
        )}
      </div>
    </>
  );
}
