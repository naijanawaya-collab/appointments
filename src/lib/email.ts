/**
 * Outgoing email with swappable drivers:
 *
 *   resend   – real delivery (set RESEND_API_KEY + EMAIL_FROM)
 *   console  – logs emails (default in development without an API key)
 *   memory   – keeps emails in `outbox` (used by tests)
 *
 * Every shop sends from the platform's verified address, with the shop's
 * name as the sender name and the shop's email as Reply-To:
 *   From: "Kaiser & Co." <bookings@mail.yourplatform.com>
 *
 * Email failures must never break a booking: callers run this after the
 * response (Next's `after()`), and errors are logged, not thrown.
 */
import { Resend } from "resend";

export type EmailAttachment = { filename: string; content: string; contentType?: string };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Display name for the From header (the shop's name). */
  fromName?: string;
  attachments?: EmailAttachment[];
};

export const outbox: EmailMessage[] = [];

type Driver = "resend" | "console" | "memory";

function driver(): Driver {
  const configured = process.env.EMAIL_DRIVER as Driver | undefined;
  if (configured) return configured;
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

/** Characters that would break a quoted display name are removed. */
const cleanName = (name: string) => name.replace(/["\\\r\n<>]/g, "").trim().slice(0, 64);

/**
 * Builds the From header: the configured address (EMAIL_FROM, e.g.
 * `Bookings <bookings@mail.example.com>` or just the address) with the
 * shop's name as display name.
 */
export function fromHeader(fromName?: string, configured = process.env.EMAIL_FROM ?? "Bookings <onboarding@resend.dev>"): string {
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured.trim();
  const name = fromName ? cleanName(fromName) : configured.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim();
  return name ? `"${name}" <${address}>` : address;
}

let resendClient: Resend | undefined;

export async function sendEmail(message: EmailMessage): Promise<void> {
  switch (driver()) {
    case "memory":
      outbox.push(message);
      return;
    case "console":
      console.info(`[email] from=${fromHeader(message.fromName)} to=${message.to} subject="${message.subject}"\n${message.text}\n`);
      return;
    case "resend": {
      resendClient ??= new Resend(process.env.RESEND_API_KEY);
      const { error } = await resendClient.emails.send({
        from: fromHeader(message.fromName),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          contentType: a.contentType,
        })),
      });
      if (error) throw new Error(`Resend: ${error.message}`);
      return;
    }
  }
}
