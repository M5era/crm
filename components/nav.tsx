"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnalyticsIcon,
  CompaniesIcon,
  ContactsIcon,
  DashboardIcon,
  InboxIcon,
  PipelineIcon,
  SettingsIcon,
} from "@/components/icons";

const ITEMS = [
  { path: "", label: "Dashboard", Icon: DashboardIcon, exact: true },
  { path: "/pipeline", label: "Pipeline", Icon: PipelineIcon },
  { path: "/replies", label: "Replies", Icon: InboxIcon },
  { path: "/contacts", label: "Contacts", Icon: ContactsIcon },
  { path: "/companies", label: "Companies", Icon: CompaniesIcon },
  { path: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { path: "/settings", label: "Settings", Icon: SettingsIcon },
];

/** A lead page belongs to the pipeline tab. */
function isActive(pathname: string, href: string, base: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === `${base}/pipeline`) {
    return pathname.startsWith(href) || pathname.startsWith(`${base}/leads`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/${workspaceSlug}`;

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ path, label, Icon, exact }) => {
        const href = `${base}${path}`;
        const active = isActive(pathname, href, base, exact);
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-surface-3 font-medium text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                active
                  ? "text-brand-soft"
                  : "text-ink-faint group-hover:text-ink-muted"
              }`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/${workspaceSlug}`;

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
      {ITEMS.map(({ path, label, Icon, exact }) => {
        const href = `${base}${path}`;
        const active = isActive(pathname, href, base, exact);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
              active
                ? "bg-surface-3 font-medium text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
