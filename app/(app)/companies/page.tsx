import Link from "next/link";
import { getCompanies } from "@/lib/queries";
import { NewCompanyDialog } from "@/components/dialogs";
import { SearchInput } from "@/components/search-input";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { CompaniesIcon } from "@/components/icons";
import { money } from "@/lib/format";

export const metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const companies = await getCompanies(q);

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle={
          q
            ? `${companies.length} ${companies.length === 1 ? "match" : "matches"} for “${q}”`
            : `${companies.length} ${companies.length === 1 ? "organisation" : "organisations"} in the CRM`
        }
        actions={<NewCompanyDialog />}
      />

      <div className="px-5 py-5 sm:px-8">
        <div className="mb-4">
          <SearchInput
            action="/companies"
            placeholder="Search name, domain or industry…"
            defaultValue={q}
          />
        </div>

        {companies.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CompaniesIcon className="h-5 w-5" />}
              title={q ? "No companies match that search" : "No companies yet"}
              description={
                q
                  ? "Try a different name, domain or industry."
                  : "Add the organisations you sell to. Contacts and deals link back to them."
              }
              action={!q ? <NewCompanyDialog /> : undefined}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="card p-4 transition-colors hover:border-line"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={company.name} size={40} color="#22d3ee" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {company.name}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {company.domain ??
                        company.industry ??
                        company.location ??
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">
                  <div>
                    <div className="text-sm font-semibold">
                      {company.contact_count}
                    </div>
                    <div className="text-[11px] text-ink-faint">Contacts</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {company.lead_count}
                    </div>
                    <div className="text-[11px] text-ink-faint">Deals</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-brand-soft">
                      {company.open_value > 0
                        ? money(company.open_value)
                        : "—"}
                    </div>
                    <div className="text-[11px] text-ink-faint">Open</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
