import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/logo";
import { MobileNav, SidebarNav } from "@/components/nav";
import { SignOutIcon } from "@/components/icons";
import { initials } from "@/lib/format";
import { hasCrmAccess } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but a Server Component must never render
  // CRM data without a verified session.
  if (!user) redirect("/login");

  const email = user.email ?? "Unknown";

  // Signed in, but not on the allowlist: say so plainly rather than showing an
  // empty CRM that looks broken.
  if (!(await hasCrmAccess())) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <Logo size={40} />
          <h1 className="mt-5 text-lg font-semibold tracking-tight">
            This account has no CRM access
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            You are signed in as{" "}
            <span className="text-ink">{email}</span>, but that address is not
            on the Inflate AI member list. An existing member can grant access
            by adding the address to the <code>crm_members</code> table.
          </p>
          <form action={signOut} className="mt-6">
            <button type="submit" className="btn btn-ghost">
              <SignOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line-soft bg-surface/60 px-3 py-5 lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <Logo size={30} />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Inflate AI</div>
            <div className="text-[11px] text-ink-faint">CRM</div>
          </div>
        </Link>

        <SidebarNav />

        <div className="mt-auto border-t border-line-soft pt-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[11px] font-semibold text-brand-soft">
              {initials(email.split("@")[0].replace(/[._-]/g, " "))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-ink" title={email}>
                {email}
              </div>
              <div className="text-[11px] text-ink-faint">Signed in</div>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <SignOutIcon className="h-[18px] w-[18px] text-ink-faint" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="border-b border-line-soft bg-surface/60 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={26} />
              <span className="text-sm font-semibold">Inflate AI CRM</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-ink-faint hover:text-ink"
                aria-label="Sign out"
              >
                <SignOutIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
          <MobileNav />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
