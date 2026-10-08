import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "./csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("only allows scripts with this request's nonce, never inline or eval in production", () => {
    const csp = buildCsp("abc123");
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows exactly the image, frame and upload hosts the app uses", () => {
    const csp = buildCsp("n");
    expect(directive(csp, "img-src")).toContain("https://res.cloudinary.com");
    expect(directive(csp, "img-src")).toContain("https://images.unsplash.com");
    expect(directive(csp, "frame-src")).toBe("frame-src 'self' https://www.openstreetmap.org");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' https://api.cloudinary.com");
  });

  it("relaxes only what Next's dev server needs, and never upgrades plain-http local requests", () => {
    const dev = buildCsp("n", { dev: true });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(buildCsp("n", { https: false })).not.toContain("upgrade-insecure-requests");
  });
});

describe("createNonce", () => {
  it("is random and base64", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});
