import "server-only";
import { createClient } from "@/lib/supabase/server";
import { daysBetween } from "@/lib/format";
import type { Activity, Lead, Stage, StageEvent } from "@/lib/types";

export type MonthPoint = {
  key: string;
  label: string;
  created: number;
  won: number;
  lost: number;
  revenue: number;
};

export type FunnelStep = {
  stage: Stage;
  /** Leads that have ever reached this stage. */
  reached: number;
  /** Leads sitting in this stage right now. */
  current: number;
  currentValue: number;
  /** Share of the leads that reached the previous stage. */
  conversionFromPrevious: number | null;
  /** Share of all leads that reached this stage. */
  conversionFromStart: number | null;
  /** Median days a lead spends here before moving on. */
  medianDaysInStage: number | null;
};

export type SourceRow = {
  source: string;
  leads: number;
  won: number;
  lost: number;
  open: number;
  winRate: number | null;
  openValue: number;
  wonValue: number;
};

export type CompanyRow = {
  id: string;
  name: string;
  leads: number;
  openValue: number;
  wonValue: number;
};

export type Analytics = {
  totals: {
    leads: number;
    openLeads: number;
    wonLeads: number;
    lostLeads: number;
    contacts: number;
    companies: number;
    activities: number;
  };
  money: {
    openPipeline: number;
    wonRevenue: number;
    lostValue: number;
    avgDealSize: number | null;
    weightedPipeline: number;
  };
  rates: {
    winRate: number | null;
    /** Leads created in the last 30 days vs the 30 days before that. */
    leadGrowth: number | null;
    leadsLast30: number;
    leadsPrev30: number;
    wonLast30: number;
    revenueLast30: number;
  };
  velocity: {
    avgDaysToClose: number | null;
    medianDaysToClose: number | null;
    avgAgeOpenLeads: number | null;
    stalledCount: number;
  };
  funnel: FunnelStep[];
  months: MonthPoint[];
  sources: SourceRow[];
  topCompanies: CompanyRow[];
  activityByType: Array<{ type: string; count: number }>;
  ownerLeaderboard: Array<{
    owner: string;
    leads: number;
    won: number;
    wonValue: number;
    openValue: number;
  }>;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Last `count` months as YYYY-MM buckets, oldest first. */
function monthBuckets(count: number) {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  cursor.setUTCMonth(cursor.getUTCMonth() - (count - 1));

  for (let i = 0; i < count; i++) {
    out.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Every metric on the analytics tab is derived here from four raw tables.
 * The aggregation runs in JS rather than SQL: at agency scale (thousands of
 * leads, not millions) one round trip per table is cheaper than six RPCs, and
 * it keeps the funnel maths in one readable place.
 */
export async function getAnalytics(
  workspaceId: string,
  monthsBack = 12,
): Promise<Analytics> {
  const supabase = await createClient();

  // stage_events has no workspace column of its own — it is reached through
  // leads, so it is filtered by the lead ids below instead.
  const [stagesRes, leadsRes, activitiesRes, contactsRes, companiesRes] =
    await Promise.all([
      supabase
        .from("stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position"),
      supabase.from("leads").select("*").eq("workspace_id", workspaceId),
      supabase.from("activities").select("*").eq("workspace_id", workspaceId),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

  for (const res of [stagesRes, leadsRes, activitiesRes]) {
    if (res.error) throw res.error;
  }

  const stages = (stagesRes.data ?? []) as Stage[];
  const leads = ((leadsRes.data ?? []) as Lead[]).map((l) => ({
    ...l,
    value: Number(l.value ?? 0),
  }));
  const activities = (activitiesRes.data ?? []) as Activity[];

  const leadIds = leads.map((l) => l.id);
  let events: StageEvent[] = [];
  if (leadIds.length > 0) {
    const eventsRes = await supabase
      .from("stage_events")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at");
    if (eventsRes.error) throw eventsRes.error;
    events = (eventsRes.data ?? []) as StageEvent[];
  }

  const openLeads = leads.filter((l) => l.status === "open");
  const wonLeads = leads.filter((l) => l.status === "won");
  const lostLeads = leads.filter((l) => l.status === "lost");

  const openPipeline = openLeads.reduce((s, l) => s + l.value, 0);
  const wonRevenue = wonLeads.reduce((s, l) => s + l.value, 0);
  const lostValue = lostLeads.reduce((s, l) => s + l.value, 0);

  // ------------------------------------------------------------- win rate
  const decided = wonLeads.length + lostLeads.length;
  const winRate = decided > 0 ? wonLeads.length / decided : null;

  // -------------------------------------------------------- 30-day windows
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const since30 = now - 30 * day;
  const since60 = now - 60 * day;

  const leadsLast30 = leads.filter(
    (l) => new Date(l.created_at).getTime() >= since30,
  ).length;
  const leadsPrev30 = leads.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= since60 && t < since30;
  }).length;
  const leadGrowth =
    leadsPrev30 > 0 ? (leadsLast30 - leadsPrev30) / leadsPrev30 : null;

  const wonLast30Leads = wonLeads.filter(
    (l) => l.closed_at && new Date(l.closed_at).getTime() >= since30,
  );

  // -------------------------------------------------------------- velocity
  const closeDurations = wonLeads
    .filter((l) => l.closed_at)
    .map((l) => daysBetween(l.created_at, l.closed_at as string));

  const openAges = openLeads.map((l) =>
    daysBetween(l.created_at, new Date().toISOString()),
  );

  // Open, untouched for 30+ days.
  const stalledCount = openLeads.filter(
    (l) => new Date(l.updated_at).getTime() < since30,
  ).length;

  // ---------------------------------------------------------------- funnel
  // "Reached" counts distinct leads that ever entered the stage, so the funnel
  // reflects history rather than only where leads happen to sit today.
  const reachedByStage = new Map<string, Set<string>>();
  for (const stage of stages) reachedByStage.set(stage.id, new Set());
  for (const event of events) {
    reachedByStage.get(event.to_stage_id)?.add(event.lead_id);
  }

  // Time spent in each stage: gap between entering it and the next transition.
  const eventsByLead = new Map<string, StageEvent[]>();
  for (const event of events) {
    const list = eventsByLead.get(event.lead_id) ?? [];
    list.push(event);
    eventsByLead.set(event.lead_id, list);
  }
  const durationsByStage = new Map<string, number[]>();
  for (const [, leadEvents] of eventsByLead) {
    for (let i = 0; i < leadEvents.length - 1; i++) {
      const current = leadEvents[i];
      const next = leadEvents[i + 1];
      const list = durationsByStage.get(current.to_stage_id) ?? [];
      list.push(daysBetween(current.created_at, next.created_at));
      durationsByStage.set(current.to_stage_id, list);
    }
  }

  const totalLeads = leads.length;
  const funnel: FunnelStep[] = stages.map((stage, index) => {
    const reached = reachedByStage.get(stage.id)?.size ?? 0;
    const previousReached =
      index === 0
        ? null
        : (reachedByStage.get(stages[index - 1].id)?.size ?? 0);
    const current = leads.filter(
      (l) => l.stage_id === stage.id && l.status !== "lost",
    );

    return {
      stage,
      reached,
      current: current.length,
      currentValue: current.reduce((s, l) => s + l.value, 0),
      conversionFromPrevious:
        previousReached && previousReached > 0 ? reached / previousReached : null,
      conversionFromStart: totalLeads > 0 ? reached / totalLeads : null,
      medianDaysInStage: median(durationsByStage.get(stage.id) ?? []),
    };
  });

  // Weighted pipeline: open value discounted by how often that stage converts
  // all the way to won.
  const wonStage = stages.find((s) => s.is_won);
  const wonReached = wonStage
    ? (reachedByStage.get(wonStage.id)?.size ?? 0)
    : 0;
  const weightedPipeline = openLeads.reduce((sum, lead) => {
    const reached = reachedByStage.get(lead.stage_id)?.size ?? 0;
    const probability = reached > 0 ? Math.min(1, wonReached / reached) : 0;
    return sum + lead.value * probability;
  }, 0);

  // ---------------------------------------------------------------- months
  const buckets = monthBuckets(monthsBack);
  const months: MonthPoint[] = buckets.map((bucket) => {
    const created = leads.filter(
      (l) => monthKey(l.created_at) === bucket.key,
    ).length;
    const closedInMonth = leads.filter(
      (l) => l.closed_at && monthKey(l.closed_at) === bucket.key,
    );
    return {
      key: bucket.key,
      label: bucket.label,
      created,
      won: closedInMonth.filter((l) => l.status === "won").length,
      lost: closedInMonth.filter((l) => l.status === "lost").length,
      revenue: closedInMonth
        .filter((l) => l.status === "won")
        .reduce((s, l) => s + l.value, 0),
    };
  });

  // --------------------------------------------------------------- sources
  const sourceKeys = Array.from(
    new Set(leads.map((l) => l.source?.trim() || "Unattributed")),
  );
  const sources: SourceRow[] = sourceKeys
    .map((source) => {
      const rows = leads.filter(
        (l) => (l.source?.trim() || "Unattributed") === source,
      );
      const won = rows.filter((l) => l.status === "won");
      const lost = rows.filter((l) => l.status === "lost");
      const settled = won.length + lost.length;
      return {
        source,
        leads: rows.length,
        won: won.length,
        lost: lost.length,
        open: rows.filter((l) => l.status === "open").length,
        winRate: settled > 0 ? won.length / settled : null,
        openValue: rows
          .filter((l) => l.status === "open")
          .reduce((s, l) => s + l.value, 0),
        wonValue: won.reduce((s, l) => s + l.value, 0),
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // ------------------------------------------------------------- companies
  const companyIds = Array.from(
    new Set(leads.map((l) => l.company_id).filter(Boolean) as string[]),
  );
  let topCompanies: CompanyRow[] = [];
  if (companyIds.length > 0) {
    const { data: companyRows } = await supabase
      .from("companies")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .in("id", companyIds);

    topCompanies = (companyRows ?? [])
      .map((company) => {
        const rows = leads.filter((l) => l.company_id === company.id);
        return {
          id: company.id as string,
          name: company.name as string,
          leads: rows.length,
          openValue: rows
            .filter((l) => l.status === "open")
            .reduce((s, l) => s + l.value, 0),
          wonValue: rows
            .filter((l) => l.status === "won")
            .reduce((s, l) => s + l.value, 0),
        };
      })
      .sort((a, b) => b.wonValue + b.openValue - (a.wonValue + a.openValue))
      .slice(0, 8);
  }

  // ---------------------------------------------------------------- owners
  const ownerKeys = Array.from(
    new Set(leads.map((l) => l.owner?.trim()).filter(Boolean) as string[]),
  );
  const ownerLeaderboard = ownerKeys
    .map((owner) => {
      const rows = leads.filter((l) => l.owner?.trim() === owner);
      const won = rows.filter((l) => l.status === "won");
      return {
        owner,
        leads: rows.length,
        won: won.length,
        wonValue: won.reduce((s, l) => s + l.value, 0),
        openValue: rows
          .filter((l) => l.status === "open")
          .reduce((s, l) => s + l.value, 0),
      };
    })
    .sort((a, b) => b.wonValue - a.wonValue)
    .slice(0, 8);

  // ------------------------------------------------------------ activities
  const activityByType = Array.from(
    activities.reduce((acc, a) => {
      acc.set(a.type, (acc.get(a.type) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: {
      leads: totalLeads,
      openLeads: openLeads.length,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      contacts: contactsRes.count ?? 0,
      companies: companiesRes.count ?? 0,
      activities: activities.length,
    },
    money: {
      openPipeline,
      wonRevenue,
      lostValue,
      avgDealSize: wonLeads.length > 0 ? wonRevenue / wonLeads.length : null,
      weightedPipeline,
    },
    rates: {
      winRate,
      leadGrowth,
      leadsLast30,
      leadsPrev30,
      wonLast30: wonLast30Leads.length,
      revenueLast30: wonLast30Leads.reduce((s, l) => s + l.value, 0),
    },
    velocity: {
      avgDaysToClose: mean(closeDurations),
      medianDaysToClose: median(closeDurations),
      avgAgeOpenLeads: mean(openAges),
      stalledCount,
    },
    funnel,
    months,
    sources,
    topCompanies,
    activityByType,
    ownerLeaderboard,
  };
}
