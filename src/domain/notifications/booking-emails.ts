/**
 * Booking emails (docs/designs/SCREENS.md §4, screens/em-*.jpg).
 *
 * Email clients don't support CSS variables or web fonts, so these use
 * table layout, inline styles and hex colours only (E-1, E-8). The shop's
 * colour comes pre-resolved as an AA-safe hex (`business.brandColor`, E-3).
 * Every value that came from a person is HTML-escaped. Pure functions.
 */
import type { BookingDetails } from "@/domain/booking/get-booking";
import { clockTime, formatDuration, formatMoney, longDate, shortDate } from "@/lib/format";
import { icsFile } from "@/lib/ics";
import { PLATFORM_NAME } from "@/lib/platform";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";
const INK = "#1d1a17";
const MUTED = "#5f5850";
const LINE = "#e6e1da";

/** "10:30" */
export const emailTime = (d: BookingDetails) => clockTime(d.startsAt, d.business.timezone);
/** "Friday 9 October 2026" */
export const emailDate = (d: BookingDetails) => longDate(d.startsAt, d.business.timezone);
/** "Fri 9 Oct, 10:30" (subject line, E-6) */
export const shortWhen = (d: BookingDetails) => `${shortDate(d.startsAt, d.business.timezone)}, ${emailTime(d)}`;

/** Kept for other callers (owner emails, logs): "Friday 9 October 2026 at 10:30". */
export function formatAppointmentTime(d: BookingDetails): string {
  return `${emailDate(d)} at ${emailTime(d)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const serviceList = (d: BookingDetails) => d.services.map((s) => s.name).join(", ");
const price = (d: BookingDetails) => formatMoney(d.totalPriceCents, d.business.currency, d.business.locale);

type Row = [label: string, value: string, strong?: boolean];

function rows(d: BookingDetails): Row[] {
  return [
    ["With", d.staffName],
    ["Services", serviceList(d)],
    ["Duration · Price", `${formatDuration(d.durationMin)} · ${price(d)}`, true],
    ...(d.business.address ? ([["Where", d.business.address]] as Row[]) : []),
  ];
}

function layout(d: BookingDetails, body: string): string {
  const b = d.business;
  const brand = escapeHtml(b.brandColor);
  const footer = [b.name, b.address].filter(Boolean).map((v) => escapeHtml(v!)).join(" · ");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(b.shortName)}</title></head>
<body style="margin:0;padding:0;background:#eeedeb;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eeedeb"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:${brand};padding:22px 28px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:36px;height:36px;background:#ffffff;border-radius:4px;text-align:center;vertical-align:middle;font:700 20px/36px ${SERIF};color:${brand}">${escapeHtml(b.mark)}</td>
    <td style="padding-left:12px;font:700 20px/1.2 ${SERIF};color:#ffffff">${escapeHtml(b.shortName)}</td>
  </tr></table>
</td></tr>
<tr><td style="padding:28px 28px 8px;font:16px/1.5 ${SANS};color:${INK}">${body}</td></tr>
<tr><td style="background:#f6f5f3;padding:18px 28px;font:13px/1.5 ${SANS};color:${MUTED}">
  ${footer}<br>Sent by ${escapeHtml(PLATFORM_NAME)} on behalf of ${escapeHtml(b.shortName)}.
</td></tr>
</table></td></tr></table></body></html>`;
}

function details(d: BookingDetails, struck = false): string {
  const deco = struck ? "text-decoration:line-through;" : "";
  const table = rows(d)
    .map(
      ([label, value, strong]) =>
        `<tr><td style="padding:12px 0;border-top:1px solid ${LINE};font:15px/1.4 ${SANS};color:${MUTED}">${escapeHtml(label)}</td>` +
        `<td align="right" style="padding:12px 0;border-top:1px solid ${LINE};font:${strong ? 700 : 400} 15px/1.4 ${SANS};color:${INK}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<div style="font:700 44px/1.1 ${SERIF};color:${INK};${deco}margin:6px 0 2px">${escapeHtml(emailTime(d))}</div>
<div style="font:600 18px/1.4 ${SANS};color:${INK};margin-bottom:18px">${escapeHtml(emailDate(d))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${LINE}">${table}</table>`;
}

function button(href: string, label: string, color: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px"><tr>
<td style="background:${escapeHtml(color)};border-radius:6px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none">${escapeHtml(label)}</a></td>
</tr></table>`;
}

function textBlock(d: BookingDetails): string[] {
  return [`${emailTime(d)}, ${emailDate(d)}`, ...rows(d).map(([l, v]) => `${l}: ${v}`)];
}

function calendarAttachment(d: BookingDetails, manageUrl: string | null, status: "CONFIRMED" | "CANCELLED") {
  const content = icsFile({
    uid: `${d.id}@appointments`,
    start: d.startsAt,
    minutes: d.durationMin,
    title: `${serviceList(d)} at ${d.business.shortName}`,
    location: d.business.address,
    description: manageUrl ? `Manage or cancel: ${manageUrl}` : null,
    url: manageUrl,
    status,
  });
  return { filename: "booking.ics", content, contentType: "text/calendar; charset=utf-8" };
}

export function bookingConfirmationEmail(d: BookingDetails, manageUrl: string) {
  const b = d.business;
  const call = b.phone ? ` Need to change something? Call ${escapeHtml(b.phone)}.` : "";
  const body = `<p style="margin:0 0 4px;font:16px/1.5 ${SANS};color:${MUTED}">Hi ${escapeHtml(firstName(d.customer.name))}, you’re booked.</p>
${details(d)}
${button(manageUrl, "Manage or cancel booking", b.brandColor)}
<p style="margin:0 0 20px;font:14px/1.5 ${SANS};color:${MUTED}">Free cancellation until ${b.cancellationWindowHours} hours before.${call}</p>`;

  return {
    subject: `Booked: ${serviceList(d)} at ${b.shortName}, ${shortWhen(d)}`,
    fromName: b.shortName,
    html: layout(d, body),
    text: [
      `Hi ${firstName(d.customer.name)}, you're booked at ${b.shortName}.`,
      "",
      ...textBlock(d),
      "",
      `Manage or cancel: ${manageUrl}`,
      `Free cancellation until ${b.cancellationWindowHours} hours before.${b.phone ? ` Call ${b.phone}.` : ""}`,
    ].join("\n"),
    attachments: [calendarAttachment(d, manageUrl, "CONFIRMED")],
  };
}

export function bookingCancelledEmail(d: BookingDetails, audience: "customer" | "owner") {
  const b = d.business;
  if (audience === "owner") {
    const body = `<p style="margin:0 0 4px;font:16px/1.5 ${SANS};color:${MUTED}">${escapeHtml(d.customer.name)} cancelled online. The time is free again.</p>${details(d, true)}`;
    return {
      subject: `Cancelled: ${d.customer.name}, ${shortWhen(d)}`,
      fromName: b.shortName,
      html: layout(d, body),
      text: [`${d.customer.name} cancelled online.`, "", ...textBlock(d)].join("\n"),
    };
  }
  const body = `<p style="margin:0 0 4px;font:700 18px/1.4 ${SANS};color:${INK}">Your booking is cancelled</p>
<p style="margin:0 0 8px;font:15px/1.5 ${SANS};color:${MUTED}">Hi ${escapeHtml(firstName(d.customer.name))}, nothing to pay. We hope to see you another time.</p>
${details(d, true)}<p style="margin:20px 0">&nbsp;</p>`;
  return {
    subject: `Cancelled: ${serviceList(d)} at ${b.shortName}, ${shortWhen(d)}`,
    fromName: b.shortName,
    html: layout(d, body),
    text: [`Your booking at ${b.shortName} is cancelled. Nothing to pay.`, "", ...textBlock(d)].join("\n"),
    attachments: [calendarAttachment(d, null, "CANCELLED")],
  };
}

export function ownerNewBookingEmail(d: BookingDetails) {
  const c = d.customer;
  const contact = [c.email, c.phone].filter(Boolean).map((v) => escapeHtml(v!)).join(" · ");
  const note = d.customerNote
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f6f5f3;border-radius:6px;font:14px/1.5 ${SANS};color:${INK}"><strong>Note:</strong> ${escapeHtml(d.customerNote)}</p>`
    : "";
  const body = `<p style="margin:0 0 4px;font:16px/1.5 ${SANS};color:${MUTED}">New booking from <strong style="color:${INK}">${escapeHtml(c.name)}</strong>${contact ? ` (${contact})` : ""}</p>
${details(d)}${note}<p style="margin:20px 0">&nbsp;</p>`;
  return {
    subject: `New booking: ${c.name}, ${shortWhen(d)}`,
    fromName: d.business.shortName,
    html: layout(d, body),
    text: [`New booking from ${c.name} ${[c.email, c.phone].filter(Boolean).join(" · ")}`, "", ...textBlock(d), ...(d.customerNote ? ["", `Note: ${d.customerNote}`] : [])].join("\n"),
  };
}
