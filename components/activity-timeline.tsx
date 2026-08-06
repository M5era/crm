import { deleteActivity } from "@/app/actions";
import { formatDateTime, relativeTime } from "@/lib/format";
import { ACTIVITY_LABELS, type Activity, type ActivityType } from "@/lib/types";
import { CalendarIcon, MailIcon, NoteIcon, PhoneIcon, TrashIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";

const TYPE_STYLE: Record<
  ActivityType,
  { color: string; Icon: (p: { className?: string }) => React.ReactElement }
> = {
  note: { color: "#9aa1b2", Icon: NoteIcon },
  call: { color: "#22d3ee", Icon: PhoneIcon },
  email: { color: "#7c6cff", Icon: MailIcon },
  meeting: { color: "#fbbf24", Icon: CalendarIcon },
  task: { color: "#34d399", Icon: CheckSquare },
};

function CheckSquare({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12 2.8 2.8L16.5 9" />
    </svg>
  );
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<NoteIcon className="h-5 w-5" />}
        title="Nothing logged yet"
        description="Calls, emails, meetings and notes you log will show up here as a timeline."
      />
    );
  }

  return (
    <ol className="relative px-4 py-4">
      {activities.map((activity, index) => {
        const style = TYPE_STYLE[activity.type] ?? TYPE_STYLE.note;
        const { Icon } = style;
        const isLast = index === activities.length - 1;

        return (
          <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 bottom-0 w-px bg-line-soft"
              />
            )}
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${style.color} 15%, var(--color-surface))`,
                color: style.color,
              }}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="group min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {activity.subject}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {ACTIVITY_LABELS[activity.type] ?? activity.type}
                    {activity.author ? ` · ${activity.author}` : ""} ·{" "}
                    <span title={formatDateTime(activity.created_at)}>
                      {relativeTime(activity.created_at)}
                    </span>
                  </p>
                </div>
                <form action={deleteActivity}>
                  <input type="hidden" name="id" value={activity.id} />
                  <button
                    type="submit"
                    aria-label="Delete activity"
                    className="text-ink-faint opacity-0 transition-opacity hover:text-negative group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
              {activity.body && (
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                  {activity.body}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
