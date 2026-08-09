"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setContactLifecycle } from "@/app/actions";
import { LIFECYCLES, lifecycleMeta } from "@/lib/types";

/** Read-only pill, used in lists. */
export function LifecycleBadge({ value }: { value: string }) {
  const meta = lifecycleMeta(value);
  return (
    <span
      className="chip"
      style={{
        backgroundColor: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

/** Editable lifecycle on a contact profile. */
export function LifecycleSelect({
  contactId,
  value,
}: {
  contactId: string;
  value: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = lifecycleMeta(value);

  return (
    <div>
      <select
        aria-label="Outreach status"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setContactLifecycle(contactId, next);
            router.refresh();
          });
        }}
        style={{ borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)` }}
      >
        {LIFECYCLES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-ink-faint">{meta.description}</p>
    </div>
  );
}
