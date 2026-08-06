"use client";

import { useState } from "react";
import { CHROME, SERIES } from "@/lib/viz";
import { compactMoney, money } from "@/lib/format";
import type { MonthPoint } from "@/lib/analytics";

const W = 640;
const H = 170;
const PAD = { top: 14, right: 8, bottom: 22, left: 44 };

/** Closed-won revenue per month. One series, one axis. */
export function RevenueChart({ months }: { months: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...months.map((m) => m.revenue));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = months.length > 1 ? innerW / (months.length - 1) : 0;

  const x = (i: number) => PAD.left + i * step;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = months.map((m, i) => `${x(i)},${y(m.revenue)}`).join(" ");
  const area = `${PAD.left},${PAD.top + innerH} ${line} ${x(months.length - 1)},${PAD.top + innerH}`;

  // Three gridlines is enough to read magnitude without becoming wallpaper.
  const ticks = [0, 0.5, 1].map((t) => ({ value: max * t, y: y(max * t) }));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label="Closed-won revenue by month"
      >
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke={CHROME.grid}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              fontSize="9"
              fill={CHROME.muted}
            >
              {compactMoney(tick.value)}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.primary} stopOpacity="0.28" />
            <stop offset="100%" stopColor={SERIES.primary} stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill="url(#revenue-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke={SERIES.primary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {months.map((month, i) => (
          <g key={month.key}>
            {hover === i && (
              <line
                x1={x(i)}
                x2={x(i)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke={CHROME.axis}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {(hover === i || month.revenue > 0) && (
              <circle
                cx={x(i)}
                cy={y(month.revenue)}
                r={hover === i ? 4.5 : 3}
                fill={SERIES.primary}
                stroke={CHROME.surface}
                strokeWidth="2"
              />
            )}
            <text
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill={hover === i ? "#e8eaf0" : CHROME.muted}
            >
              {month.label}
            </text>
            {/* Hit target, wider than the mark. */}
            <rect
              x={x(i) - step / 2}
              y={0}
              width={Math.max(step, 12)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 rounded-lg border border-line bg-surface-3 px-2.5 py-1.5 text-[11px] shadow-xl"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="font-semibold text-ink">{months[hover].label}</div>
          <div className="text-ink-muted">
            {money(months[hover].revenue)} closed
          </div>
          <div className="text-ink-faint">
            {months[hover].won} {months[hover].won === 1 ? "deal" : "deals"}
          </div>
        </div>
      )}
    </div>
  );
}
