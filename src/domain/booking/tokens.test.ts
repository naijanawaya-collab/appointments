import { describe, expect, it } from "vitest";
import { generateManageToken, hashManageToken, isPlausibleToken } from "./tokens";
import { assertTransition, canTransition } from "./status";

describe("manage tokens", () => {
  it("generates unique, url-safe tokens and stores only the hash", () => {
    const a = generateManageToken();
    const b = generateManageToken();
    expect(a.token).not.toBe(b.token);
    expect(isPlausibleToken(a.token)).toBe(true);
    expect(a.hash).toBe(hashManageToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects malformed tokens cheaply", () => {
    expect(isPlausibleToken("short")).toBe(false);
    expect(isPlausibleToken("../../etc/passwd".padEnd(43, "a"))).toBe(false);
  });
});

describe("booking status transitions", () => {
  it("allows the normal lifecycle", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("forbids leaving final states", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(() => assertTransition("no_show", "confirmed")).toThrow(/Invalid booking status/);
  });
});
