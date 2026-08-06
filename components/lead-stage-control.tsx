"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLeadToStage, setLeadStatus } from "@/app/actions";
import { CheckIcon, XIcon } from "@/components/icons";
import type { LeadStatus, Stage } from "@/lib/types";
import { stageColor } from "@/lib/viz";

/**
 * The stage stepper on a lead page. Clicking a step moves the lead; the two
 * buttons on the right settle the deal without touching its stage.
 */
export function LeadStageControl({
  leadId,
  stages,
  currentStageId,
  status,
}: {
  leadId: string;
  stages: Stage[];
  currentStageId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  function go(stageId: string) {
    if (stageId === currentStageId || pending) return;
    startTransition(async () => {
      await moveLeadToStage(leadId, stageId);
      router.refresh();
    });
  }

  function settle(next: LeadStatus) {
    startTransition(async () => {
      await setLeadStatus(leadId, next);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="label-caps">Stage</span>
        <div className="flex gap-2">
          {status !== "lost" && (
            <button
              type="button"
              onClick={() => settle("lost")}
              disabled={pending}
              className="btn btn-danger"
            >
              <XIcon className="h-3.5 w-3.5" />
              Mark lost
            </button>
          )}
          {status === "lost" && (
            <button
              type="button"
              onClick={() => settle("open")}
              disabled={pending}
              className="btn btn-ghost"
            >
              Reopen lead
            </button>
          )}
        </div>
      </div>

      <div
        className={`mt-3 flex flex-wrap gap-1.5 ${status === "lost" ? "opacity-50" : ""}`}
      >
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isPast = index < currentIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => go(stage.id)}
              disabled={pending}
              title={stage.description ?? stage.name}
              className="group flex min-w-0 flex-1 basis-32 flex-col gap-1.5 rounded-lg px-1 py-1 text-left transition-opacity disabled:opacity-60"
            >
              <span
                className="h-1.5 w-full rounded-full transition-colors"
                style={{
                  backgroundColor:
                    isCurrent || isPast
                      ? stageColor(stage)
                      : "var(--color-line)",
                }}
              />
              <span
                className={`flex items-center gap-1 truncate text-[11px] ${
                  isCurrent
                    ? "font-semibold text-ink"
                    : "text-ink-faint group-hover:text-ink-muted"
                }`}
              >
                {isPast && <CheckIcon className="h-3 w-3 text-positive" />}
                {stage.name}
              </span>
            </button>
          );
        })}
      </div>

      {status === "lost" && (
        <p className="mt-3 rounded-lg border border-negative/25 bg-negative/8 px-3 py-2 text-xs text-negative">
          This lead is marked lost. Reopen it or move it to a stage to put it
          back on the board.
        </p>
      )}
    </div>
  );
}
