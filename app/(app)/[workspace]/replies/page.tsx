import Link from "next/link";
import { getInboundCounts, getInboundMessages } from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import { CLASSIFICATIONS, MATCHED_BY_LABELS, classificationMeta } from "@/lib/types";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { InboxIcon } from "@/components/icons";
import { relativeTime } from "@/lib/format";

export const metadata = { title: "Replies" };
export const dynamic = "force-dynamic";

/**
 * Everything the mailbox received, with the CRM's verdict on each message.
 *
 * Auto-replies and bounces are listed rather than hidden. A funnel that counts
 * an out-of-office as interest is worse than one that shows you the robots and
 * lets you ignore them, and a bounce you never see is how a contact list rots
 * quietly for months.
 */
export default async function RepliesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ type?: string; unmatched?: string }>;
}) {
  const [{ workspace: slug }, { type, unmatched }] = await Promise.all([
    params,
    searchParams,
  ]);
  const workspace = await requireWorkspace(slug);

  const onlyUnmatched = unmatched === "true";
  const [messages, summary] = await Promise.all([
    getInboundMessages(workspace.id, type, onlyUnmatched),
    getInboundCounts(workspace.id),
  ]);

  const filterHref = (next: { type?: string; unmatched?: boolean }) => {
    const query = new URLSearchParams();
    if (next.type) query.set("type", next.type);
    if (next.unmatched) query.set("unmatched", "true");
    const s = query.toString();
    return `/${workspace.slug}/replies${s ? `?${s}` : ""}`;
  };

  const chipStyle = (active: boolean, color: string) => ({
    backgroundColor: active
      ? `color-mix(in srgb, ${color} 24%, transparent)`
      : "var(--color-surface-2)",
    color: active ? color : "var(--color-ink-muted)",
  });

  return (
    <>
      <PageHeader
        title="Replies"
        subtitle={
          summary.total === 0
            ? "Nothing received yet"
            : `${summary.total} message${summary.total === 1 ? "" : "s"} received${
                summary.unmatched > 0
                  ? ` · ${summary.unmatched} unmatched`
                  : ""
              }`
        }
      />

      <div className="px-5 py-5 sm:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Link
            href={filterHref({})}
            className={`chip ${
              type || onlyUnmatched
                ? "bg-surface-2 text-ink-muted hover:text-ink"
                : "bg-surface-3 text-ink"
            }`}
          >
            All {summary.total > 0 ? summary.total : ""}
          </Link>

          {CLASSIFICATIONS.map((c) => {
            const count = summary.counts.get(c.value) ?? 0;
            if (count === 0 && type !== c.value) return null;
            const active = type === c.value && !onlyUnmatched;
            return (
              <Link
                key={c.value}
                href={filterHref({ type: c.value })}
                title={c.description}
                className="chip"
                style={chipStyle(active, c.color)}
              >
                {c.label} {count}
              </Link>
            );
          })}

          {/* The queue that needs a human: mail we could not attribute to
              anyone. Guessing here would be worse than asking. */}
          {summary.unmatched > 0 && (
            <Link
              href={filterHref({ unmatched: true })}
              title="Received mail we could not match to a contact."
              className="chip"
              style={chipStyle(onlyUnmatched, "#b0812a")}
            >
              Unmatched {summary.unmatched}
            </Link>
          )}
        </div>

        <div className="card overflow-hidden">
          {messages.length === 0 ? (
            <EmptyState
              icon={<InboxIcon className="h-5 w-5" />}
              title={
                summary.total === 0
                  ? "No mail received yet"
                  : "Nothing matches that filter"
              }
              description={
                summary.total === 0
                  ? "Once the inbox workflow is running, every reply, auto-reply and bounce lands here and updates the contact it belongs to."
                  : "Try a different verdict, or clear the filter."
              }
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {messages.map((message) => {
                const meta = classificationMeta(message.classification);
                const name = message.contact
                  ? [message.contact.first_name, message.contact.last_name]
                      .filter(Boolean)
                      .join(" ")
                  : (message.from_name ?? message.from_email ?? "Unknown sender");

                return (
                  <li key={message.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} size={34} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {message.contact ? (
                            <Link
                              href={`/${workspace.slug}/contacts/${message.contact.id}`}
                              className="font-medium text-ink hover:text-brand-soft"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="font-medium text-ink">{name}</span>
                          )}

                          <span
                            className="chip"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
                              color: meta.color,
                            }}
                          >
                            {meta.singular}
                          </span>

                          {message.matched_by === "none" && (
                            <span className="chip bg-surface-2 text-ink-faint">
                              {MATCHED_BY_LABELS.none}
                            </span>
                          )}

                          <span className="ml-auto shrink-0 text-xs text-ink-faint">
                            {relativeTime(message.occurred_at)}
                          </span>
                        </div>

                        <div className="mt-0.5 truncate text-sm text-ink-muted">
                          {message.subject ?? "(no subject)"}
                        </div>

                        {message.body && (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-faint">
                            {message.body.slice(0, 300)}
                          </p>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-faint">
                          {message.from_email && <span>{message.from_email}</span>}
                          {message.matched_by &&
                            message.matched_by !== "none" && (
                              <span>{MATCHED_BY_LABELS[message.matched_by]}</span>
                            )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
