import { CHROME } from "@/lib/viz";

export type HBarRow = {
  key: string;
  label: string;
  value: number;
  /** Right-hand direct label, e.g. a formatted amount. */
  display: string;
  /** Small text under the label. */
  caption?: string;
  color: string;
};

/**
 * Horizontal bars. Chosen over vertical for named categories: labels stay
 * horizontal and readable however long the category name is.
 *
 * Each bar carries its own value as a direct label, so the chart is legible
 * without a tooltip and identity never rests on colour alone.
 */
export function HBarChart({
  rows,
  max,
}: {
  rows: HBarRow[];
  /** Shared scale ceiling; defaults to the largest row. */
  max?: number;
}) {
  const ceiling = Math.max(max ?? 0, ...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const pct = (row.value / ceiling) * 100;
        return (
          <li key={row.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-xs text-ink">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: row.color }}
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                {row.display}
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: CHROME.grid }}
              role="img"
              aria-label={`${row.label}: ${row.display}`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(pct, row.value > 0 ? 2 : 0)}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>

            {row.caption && (
              <p className="mt-1 text-[11px] text-ink-faint">{row.caption}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
