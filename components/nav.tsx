"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnalyticsIcon,
  CompaniesIcon,
  ContactsIcon,
  DashboardIcon,
  PipelineIcon,
} from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon, exact: true },
  { href: "/pipeline", label: "Pipeline", Icon: PipelineIcon },
  { href: "/contacts", label: "Contacts", Icon: ContactsIcon },
  { href: "/companies", label: "Companies", Icon: CompaniesIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
];

/** A lead page belongs to the pipeline tab. */
function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/pipeline") {
    return pathname.startsWith("/pipeline") || pathname.startsWith("/leads");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const active = isActive(pathname, href, exact);
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
                active ? "text-brand-soft" : "text-ink-faint group-hover:text-ink-muted"
              }`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const active = isActive(pathname, href, exact);
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
