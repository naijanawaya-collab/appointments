/**
 * Who may do what in the admin. Pure.
 *
 *   operator  platform staff listed in PLATFORM_ADMIN_EMAILS: creates shops,
 *             and acts as an owner of every shop (support).
 *   owner     everything for their shop(s).
 *   staff     the day-to-day: dashboard, bookings (cancel, complete,
 *             no-show, walk-ins). No catalogue, team, hours, settings,
 *             storefront or domain changes.
 */
export type Role = "owner" | "staff";

export function hasRole(role: Role, needed: Role): boolean {
  return needed === "staff" || role === "owner";
}

export function platformAdminEmails(raw = process.env.PLATFORM_ADMIN_EMAILS ?? ""): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdmin(email: string | null | undefined, raw?: string): boolean {
  return Boolean(email) && platformAdminEmails(raw).has(email!.toLowerCase());
}
