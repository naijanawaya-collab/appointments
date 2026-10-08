/** Outbound link builders used by storefront, manage page and emails. Pure. */

const digits = (s: string) => s.replace(/[^\d]/g, "");

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
export const waHref = (phone: string) => `https://wa.me/${digits(phone)}`;
export const mailHref = (email: string) => `mailto:${email}`;
export const directionsHref = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export function osmEmbed(lat: number, lon: number): string {
  const bbox = [lon - 0.006, lat - 0.0035, lon + 0.006, lat + 0.0035].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

/** Accepts "@handle", "handle" or a full URL; returns a safe profile URL or null. */
function socialUrl(value: string | null | undefined, host: string, prefix = ""): string | null {
  if (!value) return null;
  const v = value.trim();
  try {
    const url = new URL(v);
    return url.hostname.replace(/^www\./, "") === host ? url.toString() : null;
  } catch {
    const handle = v.replace(/^@/, "");
    return /^[A-Za-z0-9._]{1,40}$/.test(handle) ? `https://${host}/${prefix}${handle}` : null;
  }
}

export const instagramUrl = (v?: string | null) => socialUrl(v, "instagram.com");
export const tiktokUrl = (v?: string | null) => socialUrl(v, "tiktok.com", "@");

/** Join a site base path ("" on custom domains, "/kaiser" on the platform) with a path. */
export function siteHref(basePath: string, path = "/"): string {
  if (path === "/" || path === "") return basePath || "/";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
