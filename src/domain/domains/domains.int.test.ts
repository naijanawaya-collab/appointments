import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createShop, resetDb, type Shop } from "../../../tests/support/fixtures";
import { resolveBusiness } from "@/domain/business/resolve-business";
import { addDomain, checkDomains, listDomains, removeDomain, setPrimaryDomain, type Resolver } from "./service";
import type { VercelClient } from "./vercel";

let a: Shop;
let b: Shop;

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
});
afterAll(resetDb);

/** In-memory fake of the Vercel Domains API. */
function fakeVercel(opts: { verified?: Set<string>; misconfigured?: Set<string>; refuse?: string } = {}) {
  const added = new Set<string>();
  const client: VercelClient = {
    addDomain: vi.fn(async (name: string) => {
      if (name === opts.refuse) throw new Error("domain_already_in_use");
      added.add(name);
      return { name, verified: false, verification: [] };
    }),
    getDomain: vi.fn(async (name: string) => (added.has(name) ? { name, verified: opts.verified?.has(name) ?? false, verification: [] } : null)),
    verifyDomain: vi.fn(async (name: string) =>
      added.has(name)
        ? { name, verified: opts.verified?.has(name) ?? false, verification: opts.verified?.has(name) ? [] : [{ type: "TXT" as const, name: "_vercel", value: "vc-domain-verify=abc" }] }
        : null,
    ),
    isMisconfigured: vi.fn(async (name: string) => opts.misconfigured?.has(name) ?? false),
    removeDomain: vi.fn(async (name: string) => void added.delete(name)),
  };
  return { client, added };
}

const resolver = (a: Record<string, string[]>, cname: Record<string, string[]> = {}): Resolver => ({
  resolve4: async (h) => a[h] ?? [],
  resolveCname: async (h) => cname[h] ?? [],
});

describe("custom domains", () => {
  it("adds apex + www, makes the typed one primary, and registers both with Vercel", async () => {
    const { client, added } = fakeVercel();
    await addDomain(a.business.id, "https://www.MbaCutzHairStudio.com/", { vercel: client, platformHosts: ["nextchair.com"] });
    const rows = await listDomains(a.business.id);
    expect(rows.map((r) => [r.hostname, r.isPrimary])).toEqual([
      ["mbacutzhairstudio.com", false],
      ["www.mbacutzhairstudio.com", true],
    ]);
    expect([...added].sort()).toEqual(["mbacutzhairstudio.com", "www.mbacutzhairstudio.com"]);
    // Routing works right away (DNS decides when traffic arrives).
    expect((await resolveBusiness({ hostname: "www.mbacutzhairstudio.com" }))?.id).toBe(a.business.id);
  });

  it("rejects bad input, platform hosts, duplicates and domains of another shop", async () => {
    const deps = { vercel: null, platformHosts: ["nextchair.com"] };
    await expect(addDomain(a.business.id, "not a domain", deps)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(addDomain(a.business.id, "app.nextchair.com", deps)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await addDomain(a.business.id, "shop-a.com", deps);
    await expect(addDomain(a.business.id, "www.shop-a.com", deps)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(addDomain(b.business.id, "shop-a.com", deps)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rolls back when Vercel refuses the domain", async () => {
    const { client } = fakeVercel({ refuse: "www.taken.com" });
    await expect(addDomain(a.business.id, "taken.com", { vercel: client })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await listDomains(a.business.id)).toEqual([]);
  });

  it("Vercel status: pending (DNS wrong) → verifying (TXT needed) → live", async () => {
    const misconfigured = new Set(["shop-a.com", "www.shop-a.com"]);
    const verified = new Set<string>();
    const { client } = fakeVercel({ misconfigured, verified });
    await addDomain(a.business.id, "shop-a.com", { vercel: client });

    let statuses = await checkDomains(a.business.id, { vercel: client });
    expect(statuses.map((s) => s.state)).toEqual(["pending", "pending"]);
    expect(statuses[0].records[0]).toEqual({ type: "A", name: "@", value: "76.76.21.21" });
    expect(statuses[1].records[0]).toEqual({ type: "CNAME", name: "www", value: "cname.vercel-dns.com" });

    misconfigured.clear();
    statuses = await checkDomains(a.business.id, { vercel: client });
    expect(statuses[0].state).toBe("verifying");
    expect(statuses[0].records).toContainEqual({ type: "TXT", name: "_vercel", value: "vc-domain-verify=abc" });

    verified.add("shop-a.com").add("www.shop-a.com");
    statuses = await checkDomains(a.business.id, { vercel: client });
    expect(statuses.map((s) => s.state)).toEqual(["live", "live"]);
    expect((await listDomains(a.business.id)).every((r) => r.verifiedAt)).toBe(true);
  });

  it("without Vercel credentials, checks public DNS", async () => {
    await addDomain(a.business.id, "shop-a.com", { vercel: null });
    const dns = resolver({ "shop-a.com": ["76.76.21.21"] }, { "www.shop-a.com": ["cname.vercel-dns.com."] });
    const statuses = await checkDomains(a.business.id, { vercel: null, resolver: dns });
    expect(statuses.map((s) => s.state)).toEqual(["live", "live"]);
    const broken = await checkDomains(a.business.id, { vercel: null, resolver: resolver({ "shop-a.com": ["1.2.3.4"] }) });
    expect(broken.map((s) => s.state)).toEqual(["pending", "pending"]);
    expect((await listDomains(a.business.id)).every((r) => r.verifiedAt === null)).toBe(true);
  });

  it("switches the primary domain and promotes the partner on removal", async () => {
    const { client, added } = fakeVercel();
    await addDomain(a.business.id, "shop-a.com", { vercel: client });
    const [apex, www] = await listDomains(a.business.id);
    expect(apex.isPrimary).toBe(true);
    await setPrimaryDomain(a.business.id, www.id);
    expect((await listDomains(a.business.id)).map((r) => r.isPrimary)).toEqual([false, true]);
    await expect(setPrimaryDomain(b.business.id, www.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeDomain(b.business.id, www.id, { vercel: client })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeDomain(a.business.id, www.id, { vercel: client });
    expect((await listDomains(a.business.id)).map((r) => [r.hostname, r.isPrimary])).toEqual([["shop-a.com", true]]);
    expect(added.has("www.shop-a.com")).toBe(false);
  });
});
