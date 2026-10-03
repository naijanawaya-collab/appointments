import { describe, expect, it } from "vitest";
import { availabilityQuerySchema, bookingRequestSchema, customerDetailsSchema } from "./booking";

const uuid = "8f14e45f-ceea-4e7a-9b6c-2d3a1f0e5b71";

describe("customerDetailsSchema", () => {
  it("accepts and trims valid details", () => {
    const parsed = customerDetailsSchema.parse({ name: "  Maria ", email: " maria@example.com " });
    expect(parsed).toEqual({ name: "Maria", email: "maria@example.com", phone: "", note: "", website: "" });
  });

  it.each([
    [{ name: "M", email: "m@x.com" }, "name"],
    [{ name: "Maria", email: "not-an-email" }, "email"],
    [{ name: "Maria", email: "m@x.com", phone: "call me maybe" }, "phone"],
    [{ name: "Maria", email: "m@x.com", note: "x".repeat(501) }, "note"],
    [{ name: "Maria", email: "m@x.com", website: "http://spam" }, "website"],
  ])("rejects %o (%s)", (input, field) => {
    const result = customerDetailsSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("accepts common phone formats", () => {
    for (const phone of ["+43 660 1234567", "0660/1234567", "(01) 234-5678"]) {
      expect(customerDetailsSchema.safeParse({ name: "Maria", email: "m@x.com", phone }).success).toBe(true);
    }
  });
});

describe("bookingRequestSchema", () => {
  const valid = {
    serviceIds: [uuid],
    staffId: "any",
    startsAt: "2026-10-06T07:00:00.000Z",
    customer: { name: "Maria", email: "m@x.com" },
  };

  it("accepts a valid request", () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...valid, staffId: uuid }).success).toBe(true);
  });

  it("rejects malformed ids, times and oversized selections", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, serviceIds: ["1; DROP TABLE"] }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, staffId: "someone" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, startsAt: "tomorrow" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, serviceIds: Array(6).fill(uuid) }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, serviceIds: [] }).success).toBe(false);
  });
});

describe("availabilityQuerySchema", () => {
  it("parses comma-separated services and defaults staff to any", () => {
    expect(availabilityQuerySchema.parse({ date: "2026-10-06", services: `${uuid},${uuid}` })).toEqual({
      date: "2026-10-06",
      services: [uuid, uuid],
      staff: "any",
    });
  });

  it("rejects bad dates and ids", () => {
    expect(availabilityQuerySchema.safeParse({ date: "06.10.2026", services: uuid }).success).toBe(false);
    expect(availabilityQuerySchema.safeParse({ date: "2026-10-06", services: "abc" }).success).toBe(false);
  });
});
