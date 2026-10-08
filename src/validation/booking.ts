import { z } from "zod";

/**
 * Booking request validation, shared by the browser form (React Hook Form)
 * and the API route. The server always re-validates – never trust the client.
 */

/** Exact copy and rules from docs/designs/BEHAVIOUR.md §4. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PREFIX = "+43";

/** A phone field that only holds the prefilled country code counts as empty. */
export const normalisePhone = (v: string) => {
  const t = v.trim();
  return t === "" || t === "+" || t === PHONE_PREFIX ? "" : t;
};

export const customerDetailsSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80, "Keep your name under 80 characters"),
  email: z.string().trim().max(254).regex(EMAIL_RE, "Enter a full email address, e.g. name@example.com"),
  phone: z
    .string()
    .max(30)
    .transform(normalisePhone)
    .refine((v) => v === "" || (/^\+?[0-9 ()\-/]+$/.test(v) && /^\d{6,20}$/.test(v.replace(/\D/g, ""))), "Enter a phone number or leave it empty")
    .optional()
    .default(""),
  note: z.string().trim().max(500, "Keep the note under 500 characters").optional().default(""),
  /** Honeypot: hidden from humans, bots tend to fill it. Must stay empty. */
  website: z.string().max(0).optional().default(""),
});

export type CustomerDetailsInput = z.input<typeof customerDetailsSchema>;
export type CustomerDetails = z.output<typeof customerDetailsSchema>;

export const staffChoiceSchema = z.union([z.literal("any"), z.uuid()]);

export const bookingRequestSchema = z.object({
  serviceIds: z.array(z.uuid()).min(1, "Choose at least one service").max(5),
  staffId: staffChoiceSchema,
  startsAt: z.iso.datetime({ offset: true }),
  customer: customerDetailsSchema,
});

/** Header sent with every booking POST so a retried request can't book twice (B-18). */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

export type BookingRequest = z.input<typeof bookingRequestSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  services: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(5)),
  staff: staffChoiceSchema.default("any"),
});
