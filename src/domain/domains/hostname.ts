/**
 * Custom-domain input handling and the DNS records a shop owner has to set.
 * Pure (no DB, no network) so it's shared by the admin form and the server.
 *
 * Hosting is Vercel: apex domains point an A record at Vercel's anycast IP,
 * subdomains (www) use a CNAME. Vercel may additionally ask for a TXT record
 * when the domain is already used by another Vercel account; those come
 * from the Domains API at runtime.
 */

export const VERCEL_A_RECORD = "76.76.21.21";
export const VERCEL_CNAME = "cname.vercel-dns.com";

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string };

/** Second-level public suffixes common for our customers ("co.uk", "co.at"…). */
const MULTI_PART_SUFFIXES = new Set(["co.uk", "org.uk", "me.uk", "co.at", "or.at", "ac.at", "gv.at", "com.au", "co.nz", "com.br", "co.za", "com.tr"]);

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** The registrable domain: "www.shop.co.at" → "shop.co.at". */
export function apexOf(hostname: string): string {
  const parts = hostname.split(".");
  const lastTwo = parts.slice(-2).join(".");
  return parts.slice(MULTI_PART_SUFFIXES.has(lastTwo) ? -3 : -2).join(".");
}

export const isApex = (hostname: string) => apexOf(hostname) === hostname;

export type ParsedDomain =
  | { ok: true; hostname: string; apex: string; www: string; isApex: boolean }
  | { ok: false; error: string };

/**
 * Accepts what people paste: "https://www.MbaCutz.com/", "mbacutz.com",
 * "www.mbacutz.com:443". Rejects IPs, single labels, platform hosts and
 * anything with a path or credentials.
 */
export function parseDomainInput(raw: string, platformHosts: string[] = []): ParsedDomain {
  let value = raw.trim().toLowerCase();
  if (!value) return { ok: false, error: "Enter your domain, e.g. mbacutzhairstudio.com" };
  value = value.replace(/^[a-z]+:\/\//, "");
  if (value.includes("@")) return { ok: false, error: "Enter just the domain, without a username." };
  value = value.split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  if (/^\d+(\.\d+){3}$/.test(value) || value.includes(":")) return { ok: false, error: "Enter a domain name, not an IP address." };
  const labels = value.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || !/^[a-z]{2,63}$/.test(labels.at(-1)!)) {
    return { ok: false, error: "That doesn't look like a domain. Use the form example.com." };
  }
  if (value.length > 253) return { ok: false, error: "That domain is too long." };
  if (value.endsWith(".vercel.app") || value === "localhost" || value.endsWith(".localhost")) {
    return { ok: false, error: "Use a domain you own." };
  }
  const platform = platformHosts.map((h) => h.toLowerCase());
  if (platform.some((p) => value === p || value.endsWith(`.${p}`) || apexOf(value) === apexOf(p))) {
    return { ok: false, error: "That domain belongs to the platform." };
  }
  const apex = apexOf(value);
  return { ok: true, hostname: value, apex, www: `www.${apex}`, isApex: value === apex };
}

/** The record the registrar needs for one hostname. */
export function dnsRecordFor(hostname: string): DnsRecord {
  if (isApex(hostname)) return { type: "A", name: "@", value: VERCEL_A_RECORD };
  const apex = apexOf(hostname);
  return { type: "CNAME", name: hostname.slice(0, -(apex.length + 1)), value: VERCEL_CNAME };
}

/** Hostnames to add for one input: the apex and www always travel together. */
export function hostnamesFor(parsed: Extract<ParsedDomain, { ok: true }>): string[] {
  return parsed.isApex || parsed.hostname === parsed.www ? [parsed.apex, parsed.www] : [parsed.hostname];
}

export type DomainState = "pending" | "verifying" | "live";

export const DOMAIN_STATE_LABEL: Record<DomainState, string> = {
  pending: "Pending DNS",
  verifying: "Verifying",
  live: "Live",
};
