import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/logo";
import { SignOutIcon } from "@/components/icons";
import { hasCrmAccess } from "@/lib/queries";

/**
 * The authentication gate. The workspace shell (sidebar, nav) lives one level
 * down in [workspace]/layout.tsx, where the active workspace is known.
 */
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
            <span className="text-ink">{user.email ?? "an unknown address"}</span>
            , but that address is not on the member list. An existing member can
            grant access by adding the address to the <code>crm_members</code>{" "}
            table.
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

  return <>{children}</>;
}
