import Link from "next/link";
import type { ReactNode } from "react";
import { TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { percent } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-soft px-5 py-5 sm:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Period-over-period change as a ratio; null hides the badge. */
  delta?: number | null;
  accent?: "brand" | "positive" | "warning" | "negative";
}) {
  const accentClass = {
    brand: "text-brand-soft",
    positive: "text-positive",
    warning: "text-warning",
    negative: "text-negative",
  }[accent ?? "brand"];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="label-caps">{label}</span>
        {delta !== null && delta !== undefined && Number.isFinite(delta) && (
          <span
            className={`chip ${
              delta >= 0
                ? "bg-positive/10 text-positive"
                : "bg-negative/10 text-negative"
            }`}
          >
            {delta >= 0 ? (
              <TrendUpIcon className="h-3 w-3" />
            ) : (
              <TrendDownIcon className="h-3 w-3" />
            )}
            {percent(Math.abs(delta))}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${accentClass}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-faint">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  size = 36,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundColor: color
          ? `color-mix(in srgb, ${color} 20%, transparent)`
          : "color-mix(in srgb, var(--color-brand) 18%, transparent)",
        color: color ?? "var(--color-brand-soft)",
      }}
    >
      {text}
    </div>
  );
}

export function StageBadge({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <span
      className="chip"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}

export function StatusBadge({ status }: { status: "open" | "won" | "lost" }) {
  const map = {
    open: { label: "Open", className: "bg-brand/12 text-brand-soft" },
    won: { label: "Won", className: "bg-positive/12 text-positive" },
    lost: { label: "Lost", className: "bg-negative/12 text-negative" },
  }[status];

  return <span className={`chip ${map.className}`}>{map.label}</span>;
}

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-xs text-ink-faint">{label}</span>
      <span className="min-w-0 text-right text-sm text-ink">{children}</span>
    </div>
  );
}

export function LinkCell({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-ink hover:text-brand-soft">
      {children}
    </Link>
  );
}
