"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckIcon, PlusIcon } from "@/components/icons";
import type { Workspace } from "@/lib/types";

/**
 * Switches businesses without signing out. Landing on the same section of the
 * other workspace would be misleading — a lead id from one does not exist in
 * the other — so every switch goes to that workspace's dashboard.
 */
export function WorkspaceSwitcher({
  workspaces,
  active,
}: {
  workspaces: Workspace[];
  active: Workspace;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
          style={{ backgroundColor: active.accent }}
        >
          {active.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">
            {active.name}
          </span>
          <span className="block text-[11px] text-ink-faint">
            {workspaces.length > 1 ? "Switch business" : "Workspace"}
          </span>
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-line bg-surface-3 py-1 shadow-2xl"
        >
          {workspaces.map((workspace) => {
            const isActive = workspace.id === active.id;
            return (
              <Link
                key={workspace.id}
                href={`/${workspace.slug}`}
                role="menuitem"
                className="flex items-center gap-2.5 px-2.5 py-2 transition-colors hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={{ backgroundColor: workspace.accent }}
                >
                  {workspace.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">
                    {workspace.name}
                  </span>
                  {workspace.description && (
                    <span className="block truncate text-[11px] text-ink-faint">
                      {workspace.description}
                    </span>
                  )}
                </span>
                {isActive && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-brand-soft" />
                )}
              </Link>
            );
          })}

          <Link
            href={`/${active.slug}/settings`}
            role="menuitem"
            className="mt-1 flex items-center gap-2.5 border-t border-line-soft px-2.5 py-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-line"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm">Add a business</span>
          </Link>
        </div>
      )}
    </div>
  );
}
