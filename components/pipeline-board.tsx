"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveLeadToStage } from "@/app/actions";
import { compactMoney, formatDate, fullName, relativeTime } from "@/lib/format";
import type { LeadWithRelations, Stage } from "@/lib/types";
import { CalendarIcon } from "@/components/icons";
import { stageColor } from "@/lib/viz";

export type Column = {
  stage: Stage;
  leads: LeadWithRelations[];
  value: number;
};

export function PipelineBoard({ columns }: { columns: Column[] }) {
  const router = useRouter();
  const [board, setBoard] = useState(columns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync whenever the server sends fresh data.
  useEffect(() => setBoard(columns), [columns]);

  function move(leadId: string, toStageId: string) {
    const from = board.find((c) => c.leads.some((l) => l.id === leadId));
    if (!from || from.stage.id === toStageId) return;
    const lead = from.leads.find((l) => l.id === leadId)!;

    // Optimistic: move the card immediately, reconcile on refresh.
    setBoard((prev) =>
      prev.map((column) => {
        if (column.stage.id === from.stage.id) {
          const leads = column.leads.filter((l) => l.id !== leadId);
          return {
            ...column,
            leads,
            value: leads.reduce((s, l) => s + l.value, 0),
          };
        }
        if (column.stage.id === toStageId) {
          const leads = [{ ...lead, stage_id: toStageId }, ...column.leads];
          return {
            ...column,
            leads,
            value: leads.reduce((s, l) => s + l.value, 0),
          };
        }
        return column;
      }),
    );

    startTransition(async () => {
      try {
        await moveLeadToStage(leadId, toStageId);
      } finally {
        router.refresh();
      }
    });
  }

  const totalLeads = board.reduce((sum, c) => sum + c.leads.length, 0);

  return (
    <div className="flex gap-4 overflow-x-auto px-5 pb-6 sm:px-8">
      {board.map((column) => {
        const isOver = over === column.stage.id;
        return (
          <div
            key={column.stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(column.stage.id);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setOver((s) => (s === column.stage.id ? null : s));
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const leadId = e.dataTransfer.getData("text/lead-id") || dragging;
              if (leadId) move(leadId, column.stage.id);
              setDragging(null);
            }}
            className={`flex w-[19rem] shrink-0 flex-col rounded-xl border border-line-soft bg-surface/50 transition-colors ${
              isOver ? "drop-target" : ""
            }`}
          >
            <div className="border-b border-line-soft px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: stageColor(column.stage) }}
                  />
                  <span className="truncate text-sm font-semibold">
                    {column.stage.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink-muted">
                    {column.leads.length}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium text-ink-muted">
                  {compactMoney(column.value)}
                </span>
              </div>
              {column.stage.description && (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink-faint">
                  {column.stage.description}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2 p-2.5">
              {column.leads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-xs text-ink-faint">
                  {totalLeads === 0
                    ? "No leads yet"
                    : "Drop a lead here"}
                </div>
              ) : (
                column.leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    stages={board.map((c) => c.stage)}
                    dragging={dragging === lead.id}
                    onDragStart={(e) => {
                      setDragging(lead.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/lead-id", lead.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onMove={(stageId) => move(lead.id, stageId)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  stages,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  lead: LeadWithRelations;
  stages: Stage[];
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (stageId: string) => void;
}) {
  const contact = fullName(lead.contact);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab rounded-lg border border-line-soft bg-surface-2 p-3 transition-colors hover:border-line active:cursor-grabbing ${
        dragging ? "dragging" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink hover:text-brand-soft"
        >
          {lead.title}
        </Link>

        {/* Native select keeps the board usable on touch, where HTML5 drag
            events do not fire. */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="rounded px-1 text-ink-faint transition-colors group-hover:text-ink-muted"
          >
            ⋯
          </button>
          <select
            aria-label={`Move ${lead.title} to another stage`}
            value={lead.stage_id}
            onChange={(e) => onMove(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            style={{ padding: 0, border: "none" }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {lead.company && (
        <Link
          href={`/companies/${lead.company.id}`}
          className="mt-1 block truncate text-xs text-ink-muted hover:text-brand-soft"
        >
          {lead.company.name}
        </Link>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">
          {compactMoney(lead.value)}
        </span>
        {lead.source && (
          <span className="chip bg-surface-3 text-ink-faint">{lead.source}</span>
        )}
      </div>

      {(contact || lead.expected_close_date) && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line-soft pt-2 text-[11px] text-ink-faint">
          {contact ? (
            <Link
              href={`/contacts/${lead.contact!.id}`}
              className="truncate hover:text-brand-soft"
            >
              {contact}
            </Link>
          ) : (
            <span />
          )}
          {lead.expected_close_date && (
            <span className="flex shrink-0 items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {formatDate(lead.expected_close_date)}
            </span>
          )}
        </div>
      )}

      <div className="mt-1.5 text-[10px] text-ink-faint/70">
        Updated {relativeTime(lead.updated_at)}
      </div>
    </div>
  );
}
