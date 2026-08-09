"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveStage } from "@/app/actions";

/** Left/right arrows that reorder a stage on the board. */
export function StageReorder({
  stageId,
  workspaceId,
  canMoveUp,
  canMoveDown,
}: {
  stageId: string;
  workspaceId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveStage(stageId, workspaceId, direction);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Move stage earlier"
        disabled={!canMoveUp || pending}
        onClick={() => move("up")}
        className="rounded p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-ink-faint"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Move stage later"
        disabled={!canMoveDown || pending}
        onClick={() => move("down")}
        className="rounded p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-ink-faint"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
