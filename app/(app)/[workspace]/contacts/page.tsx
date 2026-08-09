import Link from "next/link";
import {
  getCompanyOptions,
  getContacts,
  getLifecycleCounts,
} from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import { ImportDialog, NewContactDialog } from "@/components/dialogs";
import { LifecycleBadge } from "@/components/lifecycle";
import { LIFECYCLES } from "@/lib/types";
import { SearchInput } from "@/components/search-input";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { ContactsIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { money } from "@/lib/format";

export const metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ q?: string; lifecycle?: string }>;
}) {
  const [{ workspace: slug }, { q, lifecycle }] = await Promise.all([
    params,
    searchParams,
  ]);
  const workspace = await requireWorkspace(slug);

  const [contacts, companies, lifecycleCounts] = await Promise.all([
    getContacts(workspace.id, q, lifecycle),
    getCompanyOptions(workspace.id),
    getLifecycleCounts(workspace.id),
  ]);

  const totalContacts = Array.from(lifecycleCounts.values()).reduce(
    (sum, n) => sum + n,
    0,
  );

  // Preserve the search term when switching lifecycle, and vice versa.
  const filterHref = (value?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("lifecycle", value);
    const query = params.toString();
    return `/${workspace.slug}/contacts${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={
          q
            ? `${contacts.length} ${contacts.length === 1 ? "match" : "matches"} for “${q}”`
            : `${contacts.length} ${contacts.length === 1 ? "person" : "people"} in the CRM`
        }
        actions={
          <>
            <ImportDialog workspaceId={workspace.id} entity="contacts" />
            <NewContactDialog workspaceId={workspace.id} companies={companies} />
          </>
        }
      />

      <div className="px-5 py-5 sm:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput
            action={`/${workspace.slug}/contacts`}
            placeholder="Search name, email or title…"
            defaultValue={q}
          />
          {q && <input type="hidden" name="q" value={q} />}

          {/* The outreach funnel. Deliberately not the deal pipeline: people
              sit here for as long as it takes, without crowding the board. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={filterHref()}
              className={`chip ${
                lifecycle
                  ? "bg-surface-2 text-ink-muted hover:text-ink"
                  : "bg-surface-3 text-ink"
              }`}
            >
              All {totalContacts > 0 ? totalContacts : ""}
            </Link>
            {LIFECYCLES.map((l) => {
              const count = lifecycleCounts.get(l.value) ?? 0;
              if (count === 0 && lifecycle !== l.value) return null;
              const active = lifecycle === l.value;
              return (
                <Link
                  key={l.value}
                  href={filterHref(l.value)}
                  title={l.description}
                  className="chip"
                  style={{
                    backgroundColor: active
                      ? `color-mix(in srgb, ${l.color} 24%, transparent)`
                      : "var(--color-surface-2)",
                    color: active ? l.color : "var(--color-ink-muted)",
                  }}
                >
                  {l.label} {count}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card overflow-hidden">
          {contacts.length === 0 ? (
            <EmptyState
              icon={<ContactsIcon className="h-5 w-5" />}
              title={q ? "No contacts match that search" : "No contacts yet"}
              description={
                q
                  ? "Try a different name, email or job title."
                  : "Add people one at a time, or import a list. Imported contacts do not touch the deal pipeline."
              }
              action={
                !q ? (
                  <NewContactDialog
                    workspaceId={workspace.id}
                    companies={companies}
                  />
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[54rem] text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-left">
                    <th className="label-caps px-4 py-2.5 font-semibold">
                      Name
                    </th>
                    <th className="label-caps px-4 py-2.5 font-semibold">
                      Company
                    </th>
                    <th className="label-caps px-4 py-2.5 font-semibold">
                      Contact
                    </th>
                    <th className="label-caps px-4 py-2.5 font-semibold">
                      Status
                    </th>
                    <th className="label-caps px-4 py-2.5 text-right font-semibold">
                      Deals
                    </th>
                    <th className="label-caps px-4 py-2.5 text-right font-semibold">
                      Open value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {contacts.map((contact) => {
                    const name = [contact.first_name, contact.last_name]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <tr
                        key={contact.id}
                        className="transition-colors hover:bg-surface-2/60"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/${workspace.slug}/contacts/${contact.id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar name={name} size={34} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink">
                                {name}
                              </span>
                              <span className="block truncate text-xs text-ink-faint">
                                {contact.title ?? "—"}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {contact.company ? (
                            <Link
                              href={`/${workspace.slug}/companies/${contact.company.id}`}
                              className="text-ink-muted hover:text-brand-soft"
                            >
                              {contact.company.name}
                            </Link>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-xs">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-1.5 text-ink-muted hover:text-brand-soft"
                              >
                                <MailIcon className="h-3.5 w-3.5" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center gap-1.5 text-ink-muted hover:text-brand-soft"
                              >
                                <PhoneIcon className="h-3.5 w-3.5" />
                                {contact.phone}
                              </a>
                            )}
                            {!contact.email && !contact.phone && (
                              <span className="text-ink-faint">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <LifecycleBadge value={contact.lifecycle} />
                        </td>
                        <td className="px-4 py-3 text-right text-ink-muted">
                          {contact.lead_count}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {contact.open_value > 0 ? (
                            money(contact.open_value)
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
