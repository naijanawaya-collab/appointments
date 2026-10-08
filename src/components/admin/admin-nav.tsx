"use client";

import { CalendarDays, Clock, Globe, LayoutGrid, MoreHorizontal, Palette, Scissors, Settings, Sun, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/domain/access/roles";
import { activeNav, adminHref, navFor, TAB_KEYS, type NavKey } from "./nav";

const ICONS: Record<NavKey | "more", typeof Sun> = {
  today: Sun,
  bookings: CalendarDays,
  services: Scissors,
  team: Users,
  hours: Clock,
  storefront: Palette,
  domain: Globe,
  settings: Settings,
  more: MoreHorizontal,
};

export function SidebarNav({ slug, role }: { slug: string; role: Role }) {
  const active = activeNav(usePathname(), slug);
  return (
    <nav className="ad-nav" aria-label="Admin">
      {navFor(role).map((item) => {
        const Icon = ICONS[item.key];
        return (
          <Link key={item.key} href={adminHref(slug, item.path)} aria-current={active === item.key ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar({ slug, role }: { slug: string; role: Role }) {
  const active = activeNav(usePathname(), slug);
  const tabs = navFor(role).filter((n) => TAB_KEYS.includes(n.key));
  const inMore = active === "more" || (active !== null && !TAB_KEYS.includes(active as NavKey));
  return (
    <nav className="ad-tabbar" aria-label="Admin">
      {tabs.map((item) => {
        const Icon = ICONS[item.key];
        return (
          <Link key={item.key} href={adminHref(slug, item.path)} className="ad-tab" aria-current={active === item.key ? "page" : undefined}>
            <Icon size={20} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <Link href={adminHref(slug, "/more")} className="ad-tab" aria-current={inMore ? "page" : undefined}>
        <LayoutGrid size={20} aria-hidden="true" />
        More
      </Link>
    </nav>
  );
}
