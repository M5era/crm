"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { XIcon } from "@/components/icons";
import type { ActionState } from "@/app/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * A modal wrapping a server action. Fields are passed as children so pages can
 * stay Server Components; only the open/close and pending state live on the client.
 */
export function FormDialog({
  trigger,
  triggerClassName = "btn btn-primary",
  title,
  description,
  action,
  submitLabel = "Save",
  children,
  wide = false,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  title: string;
  description?: string;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const router = useRouter();
  const titleId = useId();

  useEffect(() => {
    if (!state.ok || !open) return;

    // A one-time secret (an API key) must stay on screen until the user has
    // copied it — closing the dialog would lose it for good.
    if (state.secret) {
      router.refresh();
      return;
    }

    setOpen(false);
    router.refresh();
    if (state.redirectTo) router.push(state.redirectTo);
    // Only react to a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`card my-auto w-full ${wide ? "max-w-2xl" : "max-w-lg"} shadow-2xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
              <div>
                <h2 id={titleId} className="text-sm font-semibold">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-faint transition-colors hover:text-ink"
                aria-label="Close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form action={formAction}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-5">
                {children}
              </div>

              {state.error && (
                <p className="mx-5 mb-3 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
                  {state.error}
                </p>
              )}

              {state.ok && state.message && (
                <p className="mx-5 mb-3 rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
                  {state.message}
                </p>
              )}

              {state.secret && <SecretReveal secret={state.secret} />}

              <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  {state.secret ? "Done" : "Cancel"}
                </button>
                {!state.secret && <SubmitButton label={submitLabel} />}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Two fields side by side on wider screens. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/**
 * Shows a value that exists exactly once. The server stores only a hash, so if
 * this is dismissed without copying, the key is gone and a new one is needed.
 */
function SecretReveal({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-5 mb-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
      <p className="text-xs font-medium text-warning">
        Copy this now — it is shown once and cannot be retrieved again.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded bg-surface-3 px-2 py-1.5 font-mono text-xs text-ink">
          {secret}
        </code>
        <button
          type="button"
          className="btn btn-ghost shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
