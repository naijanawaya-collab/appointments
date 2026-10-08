/**
 * Account emails for shop owners and staff (invite, password reset). Sent
 * as the platform, in its editorial style. Pure; hex colours and tables
 * only, like the booking emails.
 */
import { PLATFORM_NAME } from "@/lib/platform";
import { escapeHtml } from "./booking-emails";

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";
const INK = "#1d1a17";
const MUTED = "#5f5850";
const ACCENT = "#a8431f"; // editorial accent, 5.9:1 on white

function layout(title: string, paragraphs: string[], cta: { href: string; label: string }, footnote: string) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font:16px/1.5 ${SANS};color:${INK}">${p}</p>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light only"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f6f3ee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e1da;border-radius:12px">
<tr><td style="padding:32px 32px 8px;font:22px ${SERIF};color:${INK}">${escapeHtml(PLATFORM_NAME)}</td></tr>
<tr><td style="padding:16px 32px 8px"><h1 style="margin:0 0 16px;font:400 30px/1.15 ${SERIF};color:${INK}">${escapeHtml(title)}</h1>${body}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${ACCENT}"><a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:14px 22px;font:600 16px ${SANS};color:#ffffff;text-decoration:none">${escapeHtml(cta.label)}</a></td></tr></table>
<p style="margin:24px 0 0;font:13px/1.5 ${SANS};color:${MUTED}">${footnote}</p></td></tr>
<tr><td style="padding:24px 32px 32px;font:12px/1.5 ${SANS};color:${MUTED}">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all">${escapeHtml(cta.href)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function inviteEmail(input: { shopName: string; inviterName: string | null; url: string; role: "owner" | "staff"; hasPassword: boolean }) {
  const shop = escapeHtml(input.shopName);
  const who = input.inviterName ? `${escapeHtml(input.inviterName)} invited you` : "You've been invited";
  const what = input.role === "owner" ? "manage bookings, services, the team and the storefront" : "see and manage the day's bookings";
  const subject = `You're invited to ${input.shopName} on ${PLATFORM_NAME}`;
  const action = input.hasPassword ? "Sign in" : "Set your password";
  const html = layout(
    `Welcome to ${input.shopName}`,
    [`${who} to ${shop} on ${escapeHtml(PLATFORM_NAME)}, where you can ${what}.`, input.hasPassword ? "Sign in with your existing password." : "Choose a password to get started."],
    { href: input.url, label: action },
    input.hasPassword ? "" : "This link works once and expires in 24 hours. If it has expired, use “Forgot?” on the sign-in page.",
  );
  const text = [
    `${input.inviterName ? `${input.inviterName} invited you` : "You've been invited"} to ${input.shopName} on ${PLATFORM_NAME}, where you can ${what}.`,
    "",
    `${action}: ${input.url}`,
    ...(input.hasPassword ? [] : ["", "This link works once and expires in 24 hours."]),
  ].join("\n");
  return { subject, html, text, fromName: PLATFORM_NAME };
}

export function resetPasswordEmail(input: { name: string; url: string }) {
  const subject = `Reset your ${PLATFORM_NAME} password`;
  const html = layout(
    "Reset your password",
    [`Hi ${escapeHtml(input.name.split(/\s+/)[0] || input.name)}, someone (hopefully you) asked to reset the password for your account.`, "Choose a new password with the button below."],
    { href: input.url, label: "Choose a new password" },
    "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email; your password stays the same.",
  );
  const text = [`Reset your ${PLATFORM_NAME} password:`, input.url, "", "The link works once and expires in 1 hour. If you didn't ask for this, ignore this email."].join("\n");
  return { subject, html, text, fromName: PLATFORM_NAME };
}
