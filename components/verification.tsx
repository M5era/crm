import { verificationMeta } from "@/lib/types";

/**
 * Tiny traffic light next to an email address in lists. A dot rather than a
 * chip: every row already carries a lifecycle chip, and the verdict only
 * needs to register when scanning for dead addresses. Renders nothing for an
 * unchecked contact — absence of a verdict is not a verdict.
 */
export function VerificationDot({
  value,
  note,
}: {
  value: string | null;
  note?: string | null;
}) {
  if (!value) return null;
  const meta = verificationMeta(value);
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: meta.color }}
      title={note ? `${meta.label} — ${note}` : meta.label}
      aria-label={`Email verification: ${meta.label}`}
    />
  );
}

/** Read-only pill for the contact profile. */
export function VerificationBadge({ value }: { value: string }) {
  const meta = verificationMeta(value);
  return (
    <span
      className="chip"
      style={{
        backgroundColor: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
        color: meta.color,
      }}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
