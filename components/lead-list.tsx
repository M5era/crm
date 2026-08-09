import Link from "next/link";
import { formatDate, money } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/types";
import { EmptyState, StageBadge, StatusBadge } from "@/components/ui";
import { stageColor } from "@/lib/viz";
import { PipelineIcon } from "@/components/icons";

/** Compact list of deals, used on contact and company profiles. */
export function LeadList({
  workspaceSlug,
  leads,
  emptyTitle = "No deals yet",
  emptyDescription,
  action,
  showCompany = false,
}: {
  workspaceSlug: string;
  leads: LeadWithRelations[];
  emptyTitle?: string;
  emptyDescription?: string;
  action?: React.ReactNode;
  showCompany?: boolean;
}) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<PipelineIcon className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  return (
    <ul className="divide-y divide-line-soft">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href={`/${workspaceSlug}/leads/${lead.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-surface-2/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {lead.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-faint">
                {showCompany && lead.company ? `${lead.company.name} · ` : ""}
                {lead.expected_close_date
                  ? `Expected ${formatDate(lead.expected_close_date)}`
                  : (lead.source ?? "Unattributed")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {lead.status === "open" && lead.stage ? (
                <StageBadge
                  name={lead.stage.name}
                  color={stageColor(lead.stage)}
                />
              ) : (
                <StatusBadge status={lead.status} />
              )}
              <span className="w-20 text-right text-sm font-semibold text-ink">
                {money(lead.value)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
