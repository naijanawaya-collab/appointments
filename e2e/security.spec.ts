import { expect, test } from "@playwright/test";

/** HTTP-level security checks (no browser UI needed). */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;

async function demoBusinessId(request: import("@playwright/test").APIRequestContext) {
  const html = await (await request.get("/book/demo-barber")).text();
  // The business id is part of the serialized props of the booking wizard.
  return html.match(/\\?"id\\?":\\?"([0-9a-f-]{36})\\?",\\?"name\\?":\\?"Demo Barbershop/)?.[1];
}

test.describe("security", () => {
  test("sends security headers and hides the framework", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("blocks cross-site booking requests (CSRF)", async ({ request }) => {
    const res = await request.post("/api/businesses/00000000-0000-4000-8000-000000000000/bookings", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(403);
  });

  test("rejects malformed booking payloads", async ({ request }) => {
    const res = await request.post("/api/businesses/00000000-0000-4000-8000-000000000000/bookings", {
      headers: { origin: BASE, "content-type": "application/json" },
      data: "{not json",
    });
    expect([400, 404]).toContain(res.status());
  });

  test("a custom domain can't reach another business's API", async ({ request }) => {
    // Node can't resolve *.localhost (browsers can), so set the Host header directly.
    const res = await request.get("/api/businesses/00000000-0000-4000-8000-000000000000/catalog", {
      headers: { host: `demo-barber.localhost:${PORT}` },
    });
    expect(res.status()).toBe(404);
  });

  test("a custom domain can't read another business's catalog via its real id", async ({ request }) => {
    const id = await demoBusinessId(request);
    const own = await request.get(`/api/businesses/${id}/catalog`, {
      headers: { host: `demo-barber.localhost:${PORT}` },
    });
    expect(own.status()).toBe(200);
    const foreign = await request.get(`/api/businesses/${id}/catalog`, {
      headers: { host: `someone-else.localhost:${PORT}` },
    });
    expect(foreign.status()).toBe(404);
  });

  test("rate-limits availability lookups per IP", async ({ request }) => {
    const id = await demoBusinessId(request);
    const ip = { "x-forwarded-for": "198.51.100.23" }; // isolated test IP
    const statuses: number[] = [];
    for (let i = 0; i < 125; i++) {
      const res = await request.get(`/api/businesses/${id}/availability?date=bad&services=x`, { headers: ip });
      statuses.push(res.status());
    }
    expect(statuses.slice(0, 120).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  test("availability rejects invalid queries", async ({ request }) => {
    const id = await demoBusinessId(request);
    expect(id).toBeTruthy();
    const bad = await request.get(`/api/businesses/${id}/availability?date=tomorrow&services=x`);
    expect(bad.status()).toBe(400);
  });
});
