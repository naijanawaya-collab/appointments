/**
 * Outgoing email with swappable drivers:
 *
 *   resend   – real delivery (set RESEND_API_KEY + EMAIL_FROM)
 *   console  – logs emails (default in development without an API key)
 *   memory   – keeps emails in `outbox` (used by tests)
 *
 * Email failures must never break a booking: callers run this after the
 * response (Next's `after()`), and errors are logged, not thrown.
 */
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export const outbox: EmailMessage[] = [];

type Driver = "resend" | "console" | "memory";

function driver(): Driver {
  const configured = process.env.EMAIL_DRIVER as Driver | undefined;
  if (configured) return configured;
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

let resendClient: Resend | undefined;

export async function sendEmail(message: EmailMessage): Promise<void> {
  switch (driver()) {
    case "memory":
      outbox.push(message);
      return;
    case "console":
      console.info(`[email] to=${message.to} subject="${message.subject}"\n${message.text}\n`);
      return;
    case "resend": {
      resendClient ??= new Resend(process.env.RESEND_API_KEY);
      const { error } = await resendClient.emails.send({
        from: process.env.EMAIL_FROM ?? "Bookings <onboarding@resend.dev>",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      });
      if (error) throw new Error(`Resend: ${error.message}`);
      return;
    }
  }
}
