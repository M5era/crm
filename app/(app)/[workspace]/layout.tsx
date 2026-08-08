import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { getWorkspaces, requireWorkspace } from "@/lib/workspace";
import { MobileNav, SidebarNav } from "@/components/nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SignOutIcon } from "@/components/icons";
import { initials } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspace = await requireWorkspace(slug);
  return {
    title: { default: `${workspace.name} CRM`, template: `%s · ${workspace.name}` },
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const [workspace, workspaces] = await Promise.all([
    requireWorkspace(slug),
    getWorkspaces(),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "Unknown";

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line-soft bg-surface/60 px-3 py-4 lg:flex">
        <WorkspaceSwitcher workspaces={workspaces} active={workspace} />

        <div className="mt-5">
          <SidebarNav workspaceSlug={workspace.slug} />
        </div>

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
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <WorkspaceSwitcher workspaces={workspaces} active={workspace} />
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="shrink-0 px-1 text-ink-faint hover:text-ink"
                aria-label="Sign out"
              >
                <SignOutIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
          <MobileNav workspaceSlug={workspace.slug} />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
