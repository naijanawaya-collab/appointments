import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { isPlatformHost, normalizeHostname } from "./hosts";
import { clientIp, isSameOrigin, publicBaseUrl } from "./request";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then blocks with a retry hint", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 10).ok).toBe(true);
    const blocked = check("ip", 20);
    expect(blocked).toMatchObject({ ok: false, remaining: 0, retryAfterSec: 1 });
    expect(check("other-ip", 20).ok).toBe(true);
  });

  it("resets after the window", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000 });
    check("ip", 0);
    expect(check("ip", 500).ok).toBe(false);
    expect(check("ip", 1001).ok).toBe(true);
  });
});

describe("hosts", () => {
  it("normalizes hostnames", () => {
    expect(normalizeHostname("BrosBab.COM:443")).toBe("brosbab.com");
    expect(normalizeHostname("brosbab.com.")).toBe("brosbab.com");
    expect(normalizeHostname(null)).toBe("");
  });

  it("detects platform hosts", () => {
    expect(isPlatformHost("localhost:3000")).toBe(true);
    expect(isPlatformHost("my-app-git-main.vercel.app")).toBe(true);
    expect(isPlatformHost("brosbab.com")).toBe(false);
    expect(isPlatformHost("demo-barber.localhost:3000")).toBe(false);
  });
});

const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { headers });

describe("request helpers", () => {
  it("reads the client IP from proxy headers", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "203.0.113.8" }))).toBe("203.0.113.8");
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("accepts same-origin and rejects cross-site requests", () => {
    expect(isSameOrigin(req({ host: "brosbab.com", origin: "https://brosbab.com" }))).toBe(true);
    expect(isSameOrigin(req({ host: "brosbab.com", origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req({ host: "brosbab.com" }))).toBe(false); // missing Origin on a POST
  });

  it("builds the public base URL from the request host", () => {
    expect(publicBaseUrl(req({ host: "brosbab.com", "x-forwarded-proto": "https" }))).toBe("https://brosbab.com");
    expect(publicBaseUrl(req({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });
});
