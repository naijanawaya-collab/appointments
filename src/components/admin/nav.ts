import type { Role } from "@/domain/access/roles";

/** Admin navigation, filtered by role. Pure (shared by server layout and client nav). */
export type NavKey = "today" | "bookings" | "services" | "team" | "hours" | "storefront" | "domain" | "settings";

export type NavItem = { key: NavKey; label: string; path: string; role: Role };

export const NAV: NavItem[] = [
  { key: "today", label: "Today", path: "", role: "staff" },
  { key: "bookings", label: "Bookings", path: "/bookings", role: "staff" },
  { key: "services", label: "Services", path: "/services", role: "owner" },
  { key: "team", label: "Team", path: "/team", role: "owner" },
  { key: "hours", label: "Opening hours", path: "/hours", role: "owner" },
  { key: "storefront", label: "Storefront", path: "/storefront", role: "owner" },
  { key: "domain", label: "Domain", path: "/domain", role: "owner" },
  { key: "settings", label: "Settings", path: "/settings", role: "owner" },
];

export const navFor = (role: Role) => NAV.filter((n) => role === "owner" || n.role === "staff");

/** Mobile tab bar: the daily things + More. */
export const TAB_KEYS: NavKey[] = ["today", "bookings", "storefront"];

export const adminHref = (slug: string, path = "") => `/admin/${slug}${path}`;

/** Which nav item a pathname belongs to (longest prefix wins; "" only for the exact root). */
export function activeNav(pathname: string, slug: string): NavKey | "more" | null {
  const base = adminHref(slug);
  if (pathname === base || pathname === `${base}/`) return "today";
  if (pathname.startsWith(`${base}/more`)) return "more";
  const hit = NAV.filter((n) => n.path && (pathname === base + n.path || pathname.startsWith(`${base}${n.path}/`)));
  return hit[0]?.key ?? null;
}
