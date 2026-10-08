import { z } from "zod";
import { validateSlug } from "@/domain/business/site";
import { hoursIssues, normaliseRanges, TIME_RE } from "@/domain/hours/edit";
import { PRESET_KEYS, type PresetKey } from "@/domain/theme/presets";
import { EMAIL_RE, normalisePhone } from "./booking";

/**
 * Admin form schemas, shared by the React Hook Form resolvers (client) and
 * the Server Actions (which always re-validate). Form fields are strings;
 * schemas transform them into what the domain layer stores.
 */

// ── field helpers ────────────────────────────────────────────────────────────

/** Optional text: trimmed, "" → null. */
const optionalText = (max: number, label = "This") =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters`)
    .transform((v) => v || null);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `Keep it under ${max} characters`);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || EMAIL_RE.test(v), "Enter a full email address, e.g. name@example.com")
  .transform((v) => v || null);

const optionalPhone = z
  .string()
  .max(30)
  .transform(normalisePhone)
  .refine((v) => v === "" || (/^\+?[0-9 ()\-/]+$/.test(v) && /^\d{6,20}$/.test(v.replace(/\D/g, ""))), "Enter a phone number or leave it empty")
  .transform((v) => v || null);

/** "" → null; otherwise must be a uuid. */
const optionalId = z
  .string()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

/** Integer from a number input (RHF gives strings unless valueAsNumber). */
const int = (min: number, max: number, label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} can be at most ${max}`);

/**
 * "25", "25,5", "25.50", "€ 1.234,50" → cents. Returns null when it isn't a
 * price. A single separator followed by 1–2 digits is the decimal part.
 */
export function parseMoneyToCents(input: string): number | null {
  const v = input.replace(/[\s€$£]/g, "");
  if (!v) return null;
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/.exec(v);
  if (!m) return null;
  const whole = Number(m[1].replace(/[.,]/g, ""));
  const fraction = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}

/** 2550 → "25,50" for the price input. */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const price = z
  .string()
  .transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (cents === null || cents > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a price like 25 or 25,50" });
      return z.NEVER;
    }
    return cents;
  });

/** Instagram / TikTok: "@handle", "handle" or a profile URL → handle. */
export function socialHandle(value: string, host: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const url = new URL(v.includes("://") ? v : `https://${v}`);
    if (url.hostname.replace(/^www\./, "") === host) {
      const first = url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "");
      return first && /^[A-Za-z0-9._]{1,40}$/.test(first) ? first : null;
    }
  } catch {
    /* not a URL */
  }
  const handle = v.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,40}$/.test(handle) ? handle : null;
}

const social = (host: string, label: string) =>
  z.string().transform((v, ctx) => {
    if (!v.trim()) return null;
    const handle = socialHandle(v, host);
    if (!handle) {
      ctx.addIssue({ code: "custom", message: `Enter your ${label} handle, e.g. @yourshop` });
      return z.NEVER;
    }
    return handle;
  });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

// ── services ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: requiredText(60, "Name the category"),
});

export const serviceSchema = z.object({
  name: requiredText(80, "Name the service"),
  description: optionalText(500, "The description"),
  categoryId: optionalId,
  durationMin: int(5, 600, "Duration"),
  bufferMin: int(0, 120, "Clean-up time"),
  price,
  isActive: z.boolean(),
  imageMediaId: optionalId,
  staffIds: z.array(z.uuid()).max(100),
});
export type ServiceFormInput = z.input<typeof serviceSchema>;
export type ServiceInput = z.output<typeof serviceSchema>;

// ── team ─────────────────────────────────────────────────────────────────────

export const staffSchema = z.object({
  displayName: requiredText(60, "Enter a name"),
  title: optionalText(60, "The title"),
  bio: optionalText(500, "The bio"),
  photoMediaId: optionalId,
  isActive: z.boolean(),
  serviceIds: z.array(z.uuid()).max(200),
});
export type StaffFormInput = z.input<typeof staffSchema>;
export type StaffInput = z.output<typeof staffSchema>;

export const timeOffSchema = z
  .object({
    startsOn: date,
    endsOn: date,
    startTime: z.string().refine((v) => v === "" || TIME_RE.test(v), "Use HH:MM"),
    endTime: z.string().refine((v) => v === "" || TIME_RE.test(v), "Use HH:MM"),
    reason: optionalText(80, "The reason"),
  })
  .refine((v) => `${v.endsOn} ${v.endTime || "24:00"}` > `${v.startsOn} ${v.startTime || "00:00"}`, {
    path: ["endsOn"],
    message: "The end must be after the start",
  });
export type TimeOffFormInput = z.input<typeof timeOffSchema>;

// ── hours ────────────────────────────────────────────────────────────────────

export const hoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(1).max(7),
      startTime: z.string(),
      endTime: z.string(),
    }),
  )
  .max(70)
  .transform(normaliseRanges)
  .superRefine((ranges, ctx) => {
    const issues = hoursIssues(ranges);
    for (const [key, message] of Object.entries(issues)) ctx.addIssue({ code: "custom", path: [key], message });
  });

export const closureSchema = z
  .object({ startsOn: date, endsOn: date, label: optionalText(80, "The note") })
  .refine((v) => v.endsOn >= v.startsOn, { path: ["endsOn"], message: "The last day can't be before the first" });
export type ClosureFormInput = z.input<typeof closureSchema>;

// ── shop details ─────────────────────────────────────────────────────────────

export const SLOT_INTERVALS = [5, 10, 15, 20, 30, 60] as const;

const isTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const coord = (min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), "Out of range");

export const businessDetailsSchema = z.object({
  name: requiredText(100, "Enter the shop's name"),
  shortName: optionalText(40, "The short name"),
  mark: optionalText(3, "The monogram"),
  eyebrow: optionalText(60, "The eyebrow"),
  tagline: optionalText(140, "The tagline"),
  description: optionalText(300, "The description"),
  aboutTitle: optionalText(80, "The title"),
  about: optionalText(2000, "The about text"),
  address: optionalText(200, "The address"),
  lat: coord(-90, 90),
  lon: coord(-180, 180),
  phone: optionalPhone,
  email: optionalEmail,
  whatsapp: optionalPhone,
  instagram: social("instagram.com", "Instagram"),
  tiktok: social("tiktok.com", "TikTok"),
  ratingValue: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 5), "Rating is between 0 and 5"),
  ratingCount: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1_000_000), "Enter a whole number"),
  legalNotice: optionalText(2000, "The legal notice"),
  timezone: z.string().refine(isTimezone, "Pick a valid time zone"),
  slotIntervalMin: z.coerce.number().refine((v) => (SLOT_INTERVALS as readonly number[]).includes(v), "Pick an interval"),
  minLeadTimeMin: int(0, 2880, "Lead time"),
  maxAdvanceDays: int(1, 365, "Booking horizon"),
  cancellationWindowHours: int(0, 168, "Cancellation window"),
});
export type BusinessDetailsFormInput = z.input<typeof businessDetailsSchema>;
export type BusinessDetailsInput = z.output<typeof businessDetailsSchema>;

export const reviewSchema = z.object({
  quote: requiredText(400, "Enter the review"),
  author: requiredText(60, "Who wrote it?"),
  source: requiredText(30, "Where is it from?"),
});
export type ReviewFormInput = z.input<typeof reviewSchema>;

// ── people ───────────────────────────────────────────────────────────────────

const requiredEmail = z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a full email address, e.g. name@example.com");

export const inviteSchema = z.object({
  email: requiredEmail,
  name: requiredText(80, "Enter their name"),
  role: z.enum(["owner", "staff"]),
});
export type InviteFormInput = z.input<typeof inviteSchema>;

export const createShopSchema = z.object({
  name: requiredText(100, "Enter the shop's name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((v, ctx) => {
      const problem = validateSlug(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  preset: z.enum(PRESET_KEYS as [PresetKey, ...PresetKey[]]),
  category: z.enum(["barber", "beauty", "other"]),
  timezone: z.string().refine(isTimezone, "Pick a valid time zone"),
  ownerEmail: requiredEmail,
  ownerName: requiredText(80, "Enter the owner's name"),
});
export type CreateShopFormInput = z.input<typeof createShopSchema>;
export type CreateShopInput = z.output<typeof createShopSchema>;

// ── bookings ─────────────────────────────────────────────────────────────────

export const walkInSchema = z.object({
  serviceIds: z.array(z.uuid()).min(1, "Choose at least one service").max(5),
  staffId: z.union([z.literal("any"), z.uuid()]),
  startsAt: z.iso.datetime({ message: "Pick a time" }),
  name: requiredText(80, "Enter the customer's name"),
  email: optionalEmail,
  phone: optionalPhone,
  note: optionalText(500, "The note"),
  source: z.enum(["walk_in", "admin"]),
});
export type WalkInFormInput = z.input<typeof walkInSchema>;

export const cancelBookingSchema = z.object({
  reason: optionalText(200, "The reason"),
  notify: z.boolean(),
});

export const internalNoteSchema = z.object({ note: optionalText(1000, "The note") });

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match" });
export type PasswordFormInput = z.input<typeof passwordSchema>;
