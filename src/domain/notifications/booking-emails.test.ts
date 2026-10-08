import { describe, expect, it } from "vitest";
import type { BookingDetails } from "@/domain/booking/get-booking";
import { contrast } from "@/domain/theme/color";
import { emailBrandColor } from "@/domain/theme/email-brand";
import { defaultConfig } from "@/domain/storefront/config";
import { fromHeader } from "@/lib/email";
import { bookingCancelledEmail, bookingConfirmationEmail, ownerNewBookingEmail } from "./booking-emails";

const details = (over: Partial<BookingDetails["business"]> = {}): BookingDetails => ({
  id: "b1",
  status: "confirmed",
  startsAt: new Date("2026-10-09T08:30:00.000Z"), // Fri 10:30 Vienna
  durationMin: 60,
  totalPriceCents: 5000,
  customerNote: "Short <b>please</b>",
  staffName: "Anton Kaiser",
  customer: { name: "Lukas Berger", email: "lukas@example.com", phone: null },
  services: [
    { name: "Classic cut", durationMin: 40, priceCents: 3200 },
    { name: "Beard trim", durationMin: 20, priceCents: 1800 },
  ],
  business: {
    id: "s1",
    name: "Kaiser & Co. Gentlemen’s Barbers",
    shortName: "Kaiser & Co.",
    mark: "K",
    slug: "kaiser",
    whatsapp: null,
    brandColor: "#7a5c25",
    timezone: "Europe/Vienna",
    currency: "EUR",
    locale: "de-AT",
    email: "hallo@kaiser.test",
    phone: "+43 1 402 18 77",
    address: "Josefstädter Straße 21, 1080 Wien",
    cancellationWindowHours: 24,
    ...over,
  },
});

describe("confirmation email", () => {
  const mail = bookingConfirmationEmail(details(), "https://kaiser-barbers.at/b/TOKEN");

  it("uses the designed subject and the shop as sender name (E-6)", () => {
    expect(mail.subject).toBe("Booked: Classic cut, Beard trim at Kaiser & Co., Fri 9 Oct, 10:30");
    expect(mail.fromName).toBe("Kaiser & Co.");
  });

  it("shows Vienna time, details and the manage button (E-5, E-10)", () => {
    expect(mail.html).toContain(">10:30<");
    expect(mail.html).toContain("Friday 9 October 2026");
    expect(mail.html).toMatch(/1 h · €\s50,00/u); // non-breaking space keeps "€ 50,00" together
    expect(mail.html).toContain('href="https://kaiser-barbers.at/b/TOKEN"');
    expect(mail.html).toContain("Hi Lukas, you’re booked.");
  });

  it("is light-only, table-based and uses hex colours only (E-1, E-8)", () => {
    expect(mail.html).toContain('content="light only"');
    expect(mail.html).toContain('role="presentation"');
    expect(mail.html).not.toMatch(/var\(--/);
  });

  it("has a plain-text part with the same content (E-4)", () => {
    expect(mail.text).toContain("10:30, Friday 9 October 2026");
    expect(mail.text).toContain("Manage or cancel: https://kaiser-barbers.at/b/TOKEN");
  });

  it("attaches an .ics file (E-5)", () => {
    expect(mail.attachments[0]).toMatchObject({ filename: "booking.ics", contentType: "text/calendar; charset=utf-8" });
    expect(mail.attachments[0].content).toContain("DTSTART:20261009T083000Z");
  });

  it("escapes HTML from people", () => {
    const owner = ownerNewBookingEmail(details());
    expect(owner.html).toContain("Short &lt;b&gt;please&lt;/b&gt;");
    expect(owner.html).not.toContain("<b>please</b>");
  });
});

describe("cancellation email (E-7)", () => {
  it("has no manage button and a cancelled .ics", () => {
    const mail = bookingCancelledEmail(details(), "customer");
    expect(mail.html).toContain("Your booking is cancelled");
    expect(mail.html).not.toContain("Manage or cancel booking");
    expect(mail.attachments?.[0].content).toContain("STATUS:CANCELLED");
  });
});

describe("brand colour (E-3)", () => {
  it("keeps dark accents and darkens light ones until white text passes AA", () => {
    expect(emailBrandColor(defaultConfig("classic"))).toBe(defaultConfig("classic").accent);
    const yellow = emailBrandColor({ ...defaultConfig("modern"), accent: "#f5e663" });
    expect(contrast(yellow, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("fromHeader", () => {
  it("uses the shop name with the platform address", () => {
    expect(fromHeader("Kaiser & Co.", "Bookings <bookings@mail.example.com>")).toBe('"Kaiser & Co." <bookings@mail.example.com>');
    expect(fromHeader(undefined, "Bookings <bookings@mail.example.com>")).toBe('"Bookings" <bookings@mail.example.com>');
    expect(fromHeader('Evil" <x@y.z>', "bookings@mail.example.com")).toBe('"Evil x@y.z" <bookings@mail.example.com>');
  });
});
