import { describe, expect, it } from "vitest";
import { hoursIssues } from "@/domain/hours/edit";
import { isPlatformAdmin, hasRole } from "@/domain/access/roles";
import {
  businessDetailsSchema,
  centsToInput,
  closureSchema,
  createShopSchema,
  hoursSchema,
  parseMoneyToCents,
  passwordSchema,
  serviceSchema,
  socialHandle,
  timeOffSchema,
  walkInSchema,
} from "./admin";

describe("parseMoneyToCents", () => {
  it.each([
    ["25", 2500],
    ["25,5", 2550],
    ["25.50", 2550],
    ["€ 1.234,50", 123450],
    ["1,234.50", 123450],
    ["0", 0],
  ])("%s → %i", (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));

  it.each(["", "abc", "25,5555", "-5", "1.2.3,4,5"])("rejects %j", (input) => expect(parseMoneyToCents(input)).toBeNull());

  it("round-trips through the input format", () => {
    expect(centsToInput(2550)).toBe("25,50");
    expect(parseMoneyToCents(centsToInput(123456))).toBe(123456);
  });
});

describe("socialHandle", () => {
  it.each([
    ["@kaiser.barbers", "kaiser.barbers"],
    ["kaiser.barbers", "kaiser.barbers"],
    ["https://www.instagram.com/kaiser.barbers/?hl=de", "kaiser.barbers"],
    ["instagram.com/kaiser.barbers", "kaiser.barbers"],
  ])("%s → %s", (input, handle) => expect(socialHandle(input, "instagram.com")).toBe(handle));

  it("rejects other sites and junk", () => {
    expect(socialHandle("https://evil.com/x", "instagram.com")).toBeNull();
    expect(socialHandle("not a handle!", "instagram.com")).toBeNull();
  });
});

describe("serviceSchema", () => {
  const valid = { name: "Cut", description: "", categoryId: "", durationMin: "30", bufferMin: "0", price: "25", isActive: true, imageMediaId: "", staffIds: [] };
  it("transforms form strings", () => {
    expect(serviceSchema.parse(valid)).toMatchObject({ durationMin: 30, price: 2500, categoryId: null, description: null });
  });
  it("explains bad values", () => {
    const r = serviceSchema.safeParse({ ...valid, name: " ", durationMin: "0", price: "x" });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["Name the service", "Duration must be at least 5", "Enter a price like 25 or 25,50"]));
  });
});

describe("hours", () => {
  it("flags reversed and overlapping ranges per row", () => {
    expect(
      hoursIssues([
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "12:00", endTime: "18:00" },
        { weekday: 2, startTime: "18:00", endTime: "09:00" },
        { weekday: 3, startTime: "9", endTime: "10:00" },
      ]),
    ).toEqual({ "1.1": "Overlaps 09:00–13:00 on Mon", "2.0": "The end must be after the start", "3.0": "Use HH:MM, e.g. 09:00" });
  });
  it("normalises and accepts a split day", () => {
    const r = hoursSchema.safeParse([
      { weekday: 6, startTime: "14:00", endTime: "18:00" },
      { weekday: 6, startTime: "9:00", endTime: "13:00" },
    ]);
    expect(r.success && r.data[0]).toEqual({ weekday: 6, startTime: "09:00", endTime: "13:00" });
  });
});

describe("dates", () => {
  it("closures can't end before they start", () => {
    expect(closureSchema.safeParse({ startsOn: "2026-12-26", endsOn: "2026-12-24", label: "" }).success).toBe(false);
    expect(closureSchema.parse({ startsOn: "2026-12-24", endsOn: "2026-12-24", label: "" })).toMatchObject({ label: null });
  });
  it("time off end must follow start (times optional)", () => {
    const base = { startsOn: "2026-10-06", endsOn: "2026-10-06", startTime: "", endTime: "", reason: "" };
    expect(timeOffSchema.safeParse(base).success).toBe(true);
    expect(timeOffSchema.safeParse({ ...base, startTime: "14:00", endTime: "12:00" }).success).toBe(false);
  });
});

describe("other forms", () => {
  it("shop creation validates the slug with the reserved list", () => {
    const base = { name: "Mba Cutz", slug: "mbacutz", preset: "bold", category: "barber", timezone: "Europe/Vienna", ownerEmail: "a@b.co", ownerName: "Mba" };
    expect(createShopSchema.safeParse(base).success).toBe(true);
    expect(createShopSchema.safeParse({ ...base, slug: "login" }).error?.issues[0].message).toMatch(/reserved/);
    expect(createShopSchema.safeParse({ ...base, timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("details: interval list, rating range, empty coords", () => {
    const r = businessDetailsSchema.safeParse({
      name: "X", shortName: "", mark: "", eyebrow: "", tagline: "", description: "", aboutTitle: "", about: "", address: "", lat: "", lon: "",
      phone: "", email: "", whatsapp: "", instagram: "", tiktok: "", ratingValue: "6", ratingCount: "", legalNotice: "",
      timezone: "Europe/Vienna", slotIntervalMin: "7", minLeadTimeMin: "0", maxAdvanceDays: "60", cancellationWindowHours: "24",
    });
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["ratingValue", "slotIntervalMin"]);
  });

  it("walk-ins don't need an email", () => {
    const r = walkInSchema.parse({ serviceIds: ["7f0c1b1e-8a4f-4f1e-9a37-0d4a1c0f9b11"], staffId: "any", startsAt: "2026-10-06T07:00:00.000Z", name: "Walk-in", email: "", phone: "+43", note: "", source: "walk_in" });
    expect(r).toMatchObject({ email: null, phone: null });
  });

  it("passwords must match", () => {
    expect(passwordSchema.safeParse({ password: "longenough", confirm: "different1" }).error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("roles", () => {
  it("owner ⊇ staff", () => {
    expect(hasRole("owner", "staff")).toBe(true);
    expect(hasRole("staff", "owner")).toBe(false);
  });
  it("operator list is case-insensitive and ignores blanks", () => {
    expect(isPlatformAdmin("Ops@X.com", " ops@x.com , ,other@x.com")).toBe(true);
    expect(isPlatformAdmin("", "")).toBe(false);
    expect(isPlatformAdmin("a@x.com", "")).toBe(false);
  });
});
