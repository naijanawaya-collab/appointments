import { z } from "zod";

/**
 * Booking request validation, shared by the browser form (React Hook Form)
 * and the API route. The server always re-validates – never trust the client.
 */

const trimmed = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, `Must be at most ${max} characters`);

export const customerDetailsSchema = z.object({
  name: trimmed(2, 100, "Please enter your name"),
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(25)
    .refine((v) => v === "" || /^\+?[0-9 ()\-/]{6,24}$/.test(v), "Enter a valid phone number")
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

export type BookingRequest = z.input<typeof bookingRequestSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  services: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(5)),
  staff: staffChoiceSchema.default("any"),
});
