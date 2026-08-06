import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
import { HBarChart, type HBarRow } from "@/components/charts/h-bar-chart";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { AnalyticsIcon } from "@/components/icons";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { compactMoney, money, percent } from "@/lib/format";
import { SERIES, stageColor } from "@/lib/viz";
import { ACTIVITY_LABELS, type ActivityType } from "@/lib/types";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const a = await getAnalytics();
  const hasLeads = a.totals.leads > 0;

  const funnelRows: HBarRow[] = a.funnel.map((step) => ({
    key: step.stage.id,
    label: step.stage.name,
    value: step.reached,
    display: `${step.reached}`,
    color: stageColor(step.stage),
    caption: [
      step.conversionFromPrevious !== null
        ? `${percent(step.conversionFromPrevious)} of previous stage`
        : "Entry point",
      `${step.current} here now · ${compactMoney(step.currentValue)}`,
      step.medianDaysInStage !== null
        ? `${step.medianDaysInStage.toFixed(1)}d median`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  const sourceRows: HBarRow[] = a.sources.slice(0, 8).map((source) => ({
    key: source.source,
    label: source.source,
    value: source.leads,
    display: `${source.leads}`,
    color: SERIES.primary,
    caption: `${source.won} won · ${source.winRate !== null ? percent(source.winRate) : "—"} win rate · ${compactMoney(source.wonValue)} closed`,
  }));

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="How the business is performing, end to end."
      />

      <div className="space-y-5 px-5 py-6 sm:px-8">
        {!hasLeads && (
          <div className="card px-4 py-3 text-sm text-ink-muted">
            <span className="font-medium text-ink">No data yet.</span> Every
            number below fills in automatically as you add leads and move them
            through the{" "}
            <Link href="/pipeline" className="text-brand-soft hover:underline">
              pipeline
            </Link>
            .
          </div>
        )}

        {/* ------------------------------------------------ headline numbers */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open pipeline"
            value={money(a.money.openPipeline)}
            hint={`${a.totals.openLeads} open ${a.totals.openLeads === 1 ? "deal" : "deals"} · ${money(a.money.weightedPipeline)} weighted`}
            accent="brand"
          />
          <StatCard
            label="Closed revenue"
            value={money(a.money.wonRevenue)}
            hint={`${a.totals.wonLeads} won · ${money(a.rates.revenueLast30)} in the last 30 days`}
            accent="positive"
          />
          <StatCard
            label="Win rate"
            value={a.rates.winRate !== null ? percent(a.rates.winRate) : "—"}
            hint={
              a.rates.winRate !== null
                ? `${a.totals.wonLeads} won vs ${a.totals.lostLeads} lost`
                : "No closed deals yet"
            }
            accent="warning"
          />
          <StatCard
            label="Average deal size"
            value={
              a.money.avgDealSize !== null ? money(a.money.avgDealSize) : "—"
            }
            hint={
              a.velocity.avgDaysToClose !== null
                ? `${a.velocity.avgDaysToClose.toFixed(0)} days to close on average`
                : "Based on won deals"
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="New leads (30d)"
            value={String(a.rates.leadsLast30)}
            delta={a.rates.leadGrowth}
            hint={`${a.rates.leadsPrev30} in the previous 30 days`}
          />
          <StatCard
            label="Deals won (30d)"
            value={String(a.rates.wonLast30)}
            hint={`${money(a.rates.revenueLast30)} closed`}
            accent="positive"
          />
          <StatCard
            label="Median time to close"
            value={
              a.velocity.medianDaysToClose !== null
                ? `${a.velocity.medianDaysToClose.toFixed(0)}d`
                : "—"
            }
            hint={
              a.velocity.avgAgeOpenLeads !== null
                ? `Open deals average ${a.velocity.avgAgeOpenLeads.toFixed(0)}d old`
                : undefined
            }
          />
          <StatCard
            label="Stalled deals"
            value={String(a.velocity.stalledCount)}
            hint="Open with no update in 30 days"
            accent={a.velocity.stalledCount > 0 ? "negative" : "brand"}
          />
        </div>

        {/* --------------------------------------------------------- funnel */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Section
            title="Pipeline funnel"
            description="Leads that have ever reached each stage, and how many converted from the one before."
          >
            <div className="px-4 py-4">
              {hasLeads ? (
                <HBarChart rows={funnelRows} />
              ) : (
                <EmptyState
                  icon={<AnalyticsIcon className="h-5 w-5" />}
                  title="The funnel builds itself"
                  description="Once leads start moving between stages, conversion rates and time-in-stage appear here."
                />
              )}
            </div>
          </Section>

          <Section
            title="Lead sources"
            description="Where deals come from, and which sources actually close."
          >
            <div className="px-4 py-4">
              {sourceRows.length > 0 ? (
                <HBarChart rows={sourceRows} />
              ) : (
                <EmptyState
                  icon={<AnalyticsIcon className="h-5 w-5" />}
                  title="No sources tracked yet"
                  description="Set a source on a lead and this breakdown starts filling in."
                />
              )}
            </div>
          </Section>
        </div>

        {/* ---------------------------------------------------------- trend */}
        <Section
          title="Lead flow"
          description="Leads created and deals won, by month."
        >
          <div className="px-4 py-4">
            <MonthlyChart months={a.months} />
          </div>
        </Section>

        <Section
          title="Closed revenue"
          description="Value of deals marked won, by the month they closed."
        >
          <div className="px-4 py-4">
            <RevenueChart months={a.months} />
          </div>
        </Section>

        {/* --------------------------------------------------------- tables */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Section
            title="Top accounts"
            description="Ranked by open plus closed value."
          >
            {a.topCompanies.length === 0 ? (
              <EmptyState
                title="No accounts with deals yet"
                description="Link a lead to a company to see it ranked here."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-left">
                    <th className="label-caps px-4 py-2">Company</th>
                    <th className="label-caps px-4 py-2 text-right">Deals</th>
                    <th className="label-caps px-4 py-2 text-right">Open</th>
                    <th className="label-caps px-4 py-2 text-right">Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {a.topCompanies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/companies/${company.id}`}
                          className="font-medium text-ink hover:text-brand-soft"
                        >
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                        {company.leads}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {compactMoney(company.openValue)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-positive">
                        {compactMoney(company.wonValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section
            title="By owner"
            description="Who is carrying and closing the pipeline."
          >
            {a.ownerLeaderboard.length === 0 ? (
              <EmptyState
                title="No owners assigned"
                description="Set an owner on a lead to track performance per person."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-left">
                    <th className="label-caps px-4 py-2">Owner</th>
                    <th className="label-caps px-4 py-2 text-right">Deals</th>
                    <th className="label-caps px-4 py-2 text-right">Won</th>
                    <th className="label-caps px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {a.ownerLeaderboard.map((row) => (
                    <tr key={row.owner}>
                      <td className="px-4 py-2.5 font-medium">{row.owner}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                        {row.leads}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                        {row.won}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-positive">
                        {compactMoney(row.wonValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        {/* ------------------------------------------------------ activity */}
        <Section
          title="Activity mix"
          description={`${a.totals.activities} touchpoints logged across the CRM.`}
        >
          <div className="px-4 py-4">
            {a.activityByType.length === 0 ? (
              <EmptyState
                title="Nothing logged yet"
                description="Calls, emails, meetings and notes logged on leads, contacts and companies are counted here."
              />
            ) : (
              <HBarChart
                rows={a.activityByType.map((row) => ({
                  key: row.type,
                  label:
                    ACTIVITY_LABELS[row.type as ActivityType] ?? row.type,
                  value: row.count,
                  display: String(row.count),
                  color: SERIES.secondary,
                }))}
              />
            )}
          </div>
        </Section>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total leads" value={String(a.totals.leads)} />
          <StatCard label="Contacts" value={String(a.totals.contacts)} />
          <StatCard label="Companies" value={String(a.totals.companies)} />
        </div>
      </div>
    </>
  );
}
