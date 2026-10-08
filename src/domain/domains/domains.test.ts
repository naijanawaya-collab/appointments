import { describe, expect, it, vi } from "vitest";
import { apexOf, dnsRecordFor, hostnamesFor, parseDomainInput } from "./hostname";
import { createVercelClient, vercelFromEnv } from "./vercel";

describe("parseDomainInput", () => {
  it.each([
    ["https://www.MbaCutzHairStudio.com/", "www.mbacutzhairstudio.com", "mbacutzhairstudio.com"],
    ["mbacutzhairstudio.com", "mbacutzhairstudio.com", "mbacutzhairstudio.com"],
    ["book.shop.co.at:443", "book.shop.co.at", "shop.co.at"],
    ["Shop.com.", "shop.com", "shop.com"],
  ])("%s", (raw, hostname, apex) => {
    expect(parseDomainInput(raw)).toMatchObject({ ok: true, hostname, apex });
  });

  it.each([
    ["", /Enter your domain/],
    ["localhost", /doesn't look like a domain/],
    ["1.2.3.4", /IP address/],
    ["user@shop.com", /without a username/],
    ["-bad-.com", /doesn't look like a domain/],
    ["shop.vercel.app", /domain you own/],
    ["app.nextchair.com", /belongs to the platform/],
    ["nextchair.com", /belongs to the platform/],
  ])("rejects %j", (raw, message) => {
    const r = parseDomainInput(raw, ["nextchair.com", "app.nextchair.com"]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(message);
  });

  it("adds apex and www together, other subdomains alone", () => {
    const p = (s: string) => parseDomainInput(s) as Extract<ReturnType<typeof parseDomainInput>, { ok: true }>;
    expect(hostnamesFor(p("shop.com"))).toEqual(["shop.com", "www.shop.com"]);
    expect(hostnamesFor(p("www.shop.com"))).toEqual(["shop.com", "www.shop.com"]);
    expect(hostnamesFor(p("book.shop.com"))).toEqual(["book.shop.com"]);
  });

  it("knows which DNS record each hostname needs", () => {
    expect(dnsRecordFor("shop.com")).toEqual({ type: "A", name: "@", value: "76.76.21.21" });
    expect(dnsRecordFor("www.shop.co.uk")).toEqual({ type: "CNAME", name: "www", value: "cname.vercel-dns.com" });
    expect(apexOf("a.b.shop.com")).toBe("shop.com");
  });
});

describe("Vercel client", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("sends the token and team, and maps verification records", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(200, { name: "shop.com", verified: false, verification: [{ type: "TXT", domain: "_vercel.shop.com", value: "vc=1" }] }),
    );
    const client = createVercelClient({ token: "t0k", projectId: "prj_1", teamId: "team_1", fetch: fetchMock as typeof fetch });
    const d = await client.addDomain("shop.com");
    expect(d).toEqual({ name: "shop.com", verified: false, verification: [{ type: "TXT", name: "_vercel.shop.com", value: "vc=1" }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.vercel.com/v10/projects/prj_1/domains?teamId=team_1");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
    expect(JSON.parse(String(init!.body))).toEqual({ name: "shop.com" });
  });

  it("treats 409 on add as 'already ours' and 404 as missing", async () => {
    const responses = [json(409, { error: { code: "domain_already_in_use", message: "in use" } }), json(200, { name: "shop.com", verified: true })];
    const client = createVercelClient({ token: "t", projectId: "p", fetch: (async () => responses.shift()!) as typeof fetch });
    expect((await client.addDomain("shop.com")).verified).toBe(true);
    const missing = createVercelClient({ token: "t", projectId: "p", fetch: (async () => new Response("", { status: 404 })) as typeof fetch });
    expect(await missing.getDomain("x.com")).toBeNull();
  });

  it("surfaces API errors", async () => {
    const client = createVercelClient({ token: "t", projectId: "p", fetch: (async () => json(403, { error: { code: "forbidden", message: "Not authorized" } })) as typeof fetch });
    await expect(client.getDomain("x.com")).rejects.toThrow("Not authorized");
  });

  it("is only configured with a token and project", () => {
    expect(vercelFromEnv({ VERCEL_TOKEN: "t" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(vercelFromEnv({ VERCEL_TOKEN: "t", VERCEL_PROJECT_ID: "p" } as unknown as NodeJS.ProcessEnv)).not.toBeNull();
  });
});
