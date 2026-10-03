/**
 * Email templates for booking events. Pure functions: details in, message out.
 * Every value that came from a customer is HTML-escaped.
 */
import type { BookingDetails } from "@/domain/booking/get-booking";
import { formatDuration, formatMoney, UI_LOCALE } from "@/lib/format";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatAppointmentTime(d: BookingDetails): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    timeZone: d.business.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d.startsAt);
}

function summaryLines(d: BookingDetails): string[] {
  return [
    `When: ${formatAppointmentTime(d)}`,
    `With: ${d.staffName}`,
    `Services: ${d.services.map((s) => s.name).join(", ")} (${formatDuration(d.durationMin)})`,
    `Price: ${formatMoney(d.totalPriceCents, d.business.currency, d.business.locale)}`,
    ...(d.business.address ? [`Where: ${d.business.address}`] : []),
  ];
}

function layout(title: string, lines: string[], cta?: { href: string; label: string }) {
  const body = lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="background:#1c1917;color:#fafaf9;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1c1917;max-width:520px;margin:0 auto;padding:24px"><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}${button}</body></html>`;
}

export function bookingConfirmationEmail(d: BookingDetails, manageUrl: string) {
  const title = `You're booked at ${d.business.name}`;
  const lines = [`Hi ${d.customer.name},`, ...summaryLines(d)];
  return {
    subject: `Booking confirmed – ${d.business.name}`,
    html: layout(title, lines, { href: manageUrl, label: "Manage or cancel booking" }),
    text: [title, "", ...lines, "", `Manage or cancel: ${manageUrl}`].join("\n"),
  };
}

export function ownerNewBookingEmail(d: BookingDetails) {
  const title = `New booking: ${d.customer.name}`;
  const lines = [
    ...summaryLines(d),
    `Customer: ${d.customer.name} <${d.customer.email ?? "no email"}>${d.customer.phone ? `, ${d.customer.phone}` : ""}`,
    ...(d.customerNote ? [`Note: ${d.customerNote}`] : []),
  ];
  return {
    subject: `New booking – ${formatAppointmentTime(d)}`,
    html: layout(title, lines),
    text: [title, "", ...lines].join("\n"),
  };
}

export function bookingCancelledEmail(d: BookingDetails, audience: "customer" | "owner") {
  const title =
    audience === "customer" ? `Your booking at ${d.business.name} is cancelled` : `Booking cancelled: ${d.customer.name}`;
  const lines = summaryLines(d);
  return {
    subject: audience === "customer" ? `Booking cancelled – ${d.business.name}` : `Cancelled – ${formatAppointmentTime(d)}`,
    html: layout(title, lines),
    text: [title, "", ...lines].join("\n"),
  };
}
