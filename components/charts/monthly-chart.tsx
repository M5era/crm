"use client";

import { useState } from "react";
import { CHROME, SERIES } from "@/lib/viz";
import { compactMoney } from "@/lib/format";
import type { MonthPoint } from "@/lib/analytics";

/**
 * Two measures over twelve months. Counts and revenue never share an axis —
 * revenue gets its own chart below rather than a second y-scale.
 */
export function MonthlyChart({ months }: { months: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((m) => Math.max(m.created, m.won)));

  return (
    <div>
      <Legend
        items={[
          { label: "Leads created", color: SERIES.primary },
          { label: "Deals won", color: SERIES.secondary },
        ]}
      />

      <div
        className="relative mt-4 flex items-end gap-1.5"
        style={{ height: 148 }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Recessive baseline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ backgroundColor: CHROME.axis }}
        />

        {months.map((month, index) => {
          const active = hover === index;
          return (
            <div
              key={month.key}
              className="relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(index)}
            >
              {active && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-lg border border-line bg-surface-3 px-2.5 py-1.5 text-[11px] shadow-xl">
                  <div className="font-semibold text-ink">{month.label}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-ink-muted">
                    <span
                      className="h-1.5 w-1.5 rounded-[1px]"
                      style={{ backgroundColor: SERIES.primary }}
                    />
                    {month.created} created
                  </div>
                  <div className="flex items-center gap-1.5 text-ink-muted">
                    <span
                      className="h-1.5 w-1.5 rounded-[1px]"
                      style={{ backgroundColor: SERIES.secondary }}
                    />
                    {month.won} won
                  </div>
                  {month.revenue > 0 && (
                    <div className="mt-1 border-t border-line pt-1 text-ink">
                      {compactMoney(month.revenue)} closed
                    </div>
                  )}
                </div>
              )}

              {/* 2px gap between the paired bars keeps the fills separate. */}
              <div className="flex h-full items-end justify-center gap-[2px]">
                <Bar
                  height={(month.created / max) * 100}
                  color={SERIES.primary}
                  dim={hover !== null && !active}
                />
                <Bar
                  height={(month.won / max) * 100}
                  color={SERIES.secondary}
                  dim={hover !== null && !active}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {months.map((month, index) => (
          <span
            key={month.key}
            className={`flex-1 text-center text-[10px] tabular-nums ${
              hover === index ? "text-ink" : "text-ink-faint"
            }`}
          >
            {month.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bar({
  height,
  color,
  dim,
}: {
  height: number;
  color: string;
  dim: boolean;
}) {
  return (
    <div
      className="w-full max-w-[10px] rounded-t-[4px] transition-all duration-200"
      style={{
        height: `${Math.max(height, height > 0 ? 3 : 1.5)}%`,
        backgroundColor: height > 0 ? color : CHROME.grid,
        opacity: dim ? 0.45 : 1,
      }}
    />
  );
}

export function Legend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] text-ink-muted"
        >
          <span
            aria-hidden
            className="h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
