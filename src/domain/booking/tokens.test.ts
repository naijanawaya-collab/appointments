import { describe, expect, it } from "vitest";
import { hashManageToken, isPlausibleToken, manageTokenFor } from "./tokens";
import { assertTransition, canTransition } from "./status";

describe("manage tokens", () => {
  it("derives a stable, url-safe token per booking and stores only the hash", () => {
    const a = manageTokenFor("11111111-1111-4111-8111-111111111111");
    const b = manageTokenFor("22222222-2222-4222-8222-222222222222");
    expect(a.token).not.toBe(b.token);
    expect(manageTokenFor("11111111-1111-4111-8111-111111111111")).toEqual(a); // same booking → same link
    expect(isPlausibleToken(a.token)).toBe(true);
    expect(a.hash).toBe(hashManageToken(a.token));
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
