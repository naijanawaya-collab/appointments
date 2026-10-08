/**
 * A shop's custom domains.
 *
 * With Vercel credentials the domain is added to the Vercel project (which
 * issues the TLS certificate) and its status comes from Vercel. Without
 * them (local dev, or before the token is set up) we check public DNS and
 * the operator adds the domain in the Vercel dashboard by hand.
 *
 * Routing never depends on this status: as soon as DNS points at us, the
 * proxy serves the shop on that host. `verifiedAt` decides the canonical URL.
 */
import { resolve4, resolveCname } from "node:dns/promises";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { businessDomains } from "@/db/schema";
import { DomainError, PG_UNIQUE_VIOLATION, pgErrorCode } from "@/domain/errors";
import { apexOf, dnsRecordFor, hostnamesFor, isApex, parseDomainInput, VERCEL_A_RECORD, type DnsRecord, type DomainState } from "./hostname";
import type { VercelClient } from "./vercel";

export type Resolver = { resolve4(host: string): Promise<string[]>; resolveCname(host: string): Promise<string[]> };
export const systemResolver: Resolver = { resolve4, resolveCname };

export type DomainRow = typeof businessDomains.$inferSelect;

export type DomainStatus = {
  id: string;
  hostname: string;
  isPrimary: boolean;
  state: DomainState;
  /** What to set at the registrar for this hostname. */
  records: DnsRecord[];
};

export type DomainDeps = { vercel: VercelClient | null; resolver?: Resolver; platformHosts?: string[]; now?: Date };

export async function listDomains(businessId: string): Promise<DomainRow[]> {
  return db
    .select()
    .from(businessDomains)
    .where(eq(businessDomains.businessId, businessId))
    .orderBy(asc(businessDomains.createdAt), asc(businessDomains.hostname));
}

/** Status from what we last stored (no network). */
export function storedStatus(row: DomainRow): DomainStatus {
  return { id: row.id, hostname: row.hostname, isPrimary: row.isPrimary, state: row.verifiedAt ? "live" : "pending", records: [dnsRecordFor(row.hostname)] };
}

export async function addDomain(businessId: string, raw: string, deps: DomainDeps): Promise<DomainRow[]> {
  const parsed = parseDomainInput(raw, deps.platformHosts);
  if (!parsed.ok) throw new DomainError("INVALID_INPUT", parsed.error);
  const existing = await listDomains(businessId);
  const wanted = hostnamesFor(parsed).filter((h) => !existing.some((e) => e.hostname === h));
  if (!wanted.length) throw new DomainError("CONFLICT", "That domain is already connected.");

  let rows: DomainRow[];
  try {
    rows = await db
      .insert(businessDomains)
      .values(
        wanted.map((hostname) => ({
          businessId,
          hostname,
          // The address people typed becomes the main one, unless there already is one.
          isPrimary: !existing.some((e) => e.isPrimary) && hostname === parsed.hostname,
        })),
      )
      .returning();
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new DomainError("CONFLICT", "That domain is connected to another shop.");
    throw err;
  }

  if (deps.vercel) {
    try {
      for (const row of rows) await deps.vercel.addDomain(row.hostname);
    } catch (err) {
      await db.delete(businessDomains).where(inArray(businessDomains.id, rows.map((r) => r.id)));
      console.error("[domains] vercel add failed", err);
      throw new DomainError("CONFLICT", "The hosting provider refused this domain. It may be connected to another account.");
    }
  }
  return rows;
}

async function pointsAtUs(hostname: string, resolver: Resolver): Promise<boolean> {
  const ips = await resolver.resolve4(hostname).catch(() => [] as string[]);
  if (ips.includes(VERCEL_A_RECORD)) return true;
  if (isApex(hostname)) return false;
  const cnames = await resolver.resolveCname(hostname).catch(() => [] as string[]);
  return cnames.some((c) => c.replace(/\.$/, "").endsWith("vercel-dns.com"));
}

/** Re-checks every domain and stores `verifiedAt` for the ones that are live. */
export async function checkDomains(businessId: string, deps: DomainDeps): Promise<DomainStatus[]> {
  const rows = await listDomains(businessId);
  const now = deps.now ?? new Date();
  const resolver = deps.resolver ?? systemResolver;

  return Promise.all(
    rows.map(async (row): Promise<DomainStatus> => {
      const records = [dnsRecordFor(row.hostname)];
      let state: DomainState;
      try {
        if (deps.vercel) {
          const [domain, misconfigured] = await Promise.all([
            deps.vercel.verifyDomain(row.hostname),
            deps.vercel.isMisconfigured(row.hostname),
          ]);
          if (!domain) {
            // Removed in the Vercel dashboard: add it back so it can verify.
            await deps.vercel.addDomain(row.hostname);
            state = "pending";
          } else {
            records.push(...domain.verification);
            state = domain.verified && !misconfigured ? "live" : misconfigured ? "pending" : "verifying";
          }
        } else {
          state = (await pointsAtUs(row.hostname, resolver)) ? "live" : "pending";
        }
      } catch (err) {
        console.error("[domains] check failed", row.hostname, err);
        state = row.verifiedAt ? "live" : "pending";
      }

      const verifiedAt = state === "live" ? (row.verifiedAt ?? now) : null;
      if ((verifiedAt?.getTime() ?? null) !== (row.verifiedAt?.getTime() ?? null)) {
        await db.update(businessDomains).set({ verifiedAt }).where(eq(businessDomains.id, row.id));
      }
      return { id: row.id, hostname: row.hostname, isPrimary: row.isPrimary, state, records };
    }),
  );
}

export async function setPrimaryDomain(businessId: string, domainId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(businessDomains)
      .set({ isPrimary: true })
      .where(and(eq(businessDomains.id, domainId), eq(businessDomains.businessId, businessId)))
      .returning();
    if (!row) throw new DomainError("NOT_FOUND", "Domain not found.");
    await tx
      .update(businessDomains)
      .set({ isPrimary: false })
      .where(and(eq(businessDomains.businessId, businessId), ne(businessDomains.id, domainId)));
  });
}

/** Removes a hostname (and its www/apex partner when asked). */
export async function removeDomain(businessId: string, domainId: string, deps: DomainDeps) {
  const rows = await listDomains(businessId);
  const target = rows.find((r) => r.id === domainId);
  if (!target) throw new DomainError("NOT_FOUND", "Domain not found.");
  await db.delete(businessDomains).where(and(eq(businessDomains.id, domainId), eq(businessDomains.businessId, businessId)));
  if (target.isPrimary) {
    // Promote the partner (www ↔ apex) or the first remaining domain.
    const rest = rows.filter((r) => r.id !== domainId);
    const next = rest.find((r) => apexOf(r.hostname) === apexOf(target.hostname)) ?? rest[0];
    if (next) await db.update(businessDomains).set({ isPrimary: true }).where(eq(businessDomains.id, next.id));
  }
  if (deps.vercel) {
    try {
      await deps.vercel.removeDomain(target.hostname);
    } catch (err) {
      console.error("[domains] vercel remove failed", target.hostname, err); // row is gone; the operator can tidy up in Vercel
    }
  }
}
