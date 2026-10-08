/**
 * Team management: professionals, what they offer, when they work, time off.
 */
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { media, openingHours, services, staff, staffServices, timeOff, workingHours } from "@/db/schema";
import { zonedDateTime } from "@/domain/availability/compute-slots";
import { DomainError, PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/domain/errors";
import type { HoursRange } from "@/domain/hours/edit";
import { toMediaView, type MediaView } from "@/domain/media/image";
import type { StaffInput } from "@/validation/admin";

export type AdminStaff = typeof staff.$inferSelect & { serviceIds: string[]; photo: MediaView | null };

export async function listStaff(businessId: string): Promise<AdminStaff[]> {
  const rows = await db
    .select({ staff, photo: media })
    .from(staff)
    .leftJoin(media, eq(media.id, staff.photoMediaId))
    .where(eq(staff.businessId, businessId))
    .orderBy(asc(staff.sortOrder), asc(staff.displayName));
  const links = rows.length
    ? await db.select().from(staffServices).where(inArray(staffServices.staffId, rows.map((r) => r.staff.id)))
    : [];
  return rows.map(({ staff: s, photo }) => ({
    ...s,
    photo: photo ? toMediaView(photo) : null,
    serviceIds: links.filter((l) => l.staffId === s.id).map((l) => l.serviceId),
  }));
}

export async function getStaffMember(businessId: string, staffId: string) {
  const all = await listStaff(businessId);
  const member = all.find((s) => s.id === staffId);
  if (!member) throw new DomainError("NOT_FOUND", "Team member not found.");
  const [hours, off] = await Promise.all([
    db
      .select({ weekday: workingHours.weekday, startTime: workingHours.startTime, endTime: workingHours.endTime })
      .from(workingHours)
      .where(eq(workingHours.staffId, staffId)),
    db
      .select()
      .from(timeOff)
      .where(and(eq(timeOff.staffId, staffId), gte(timeOff.endsAt, new Date())))
      .orderBy(asc(timeOff.startsAt)),
  ]);
  return { member, hours: hours.map(hhmmRange), timeOff: off };
}

const hhmmRange = (r: HoursRange): HoursRange => ({ weekday: r.weekday, startTime: r.startTime.slice(0, 5), endTime: r.endTime.slice(0, 5) });

async function assertOwnServices(businessId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return unique;
  const rows = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.businessId, businessId), inArray(services.id, unique)));
  if (rows.length !== unique.length) throw new DomainError("INVALID_INPUT", "Some services don't belong to this shop.");
  return unique;
}

async function assertOwnPhoto(businessId: string, mediaId: string | null) {
  if (!mediaId) return;
  const [row] = await db.select({ id: media.id }).from(media).where(and(eq(media.id, mediaId), eq(media.businessId, businessId)));
  if (!row) throw new DomainError("INVALID_INPUT", "That photo doesn't belong to this shop.");
}

/** New professionals start with the shop's opening hours (they can be edited after). */
export async function createStaff(businessId: string, input: StaffInput) {
  const serviceIds = await assertOwnServices(businessId, input.serviceIds);
  await assertOwnPhoto(businessId, input.photoMediaId);
  return db.transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${staff.sortOrder}) + 1, 0)::int` })
      .from(staff)
      .where(eq(staff.businessId, businessId));
    const [row] = await tx
      .insert(staff)
      .values({
        businessId,
        displayName: input.displayName,
        title: input.title,
        bio: input.bio,
        photoMediaId: input.photoMediaId,
        isActive: input.isActive,
        sortOrder: next,
      })
      .returning();
    if (serviceIds.length) await tx.insert(staffServices).values(serviceIds.map((serviceId) => ({ staffId: row.id, serviceId })));
    const shopHours = await tx
      .select({ weekday: openingHours.weekday, startTime: openingHours.startTime, endTime: openingHours.endTime })
      .from(openingHours)
      .where(eq(openingHours.businessId, businessId));
    if (shopHours.length) await tx.insert(workingHours).values(shopHours.map((h) => ({ ...h, staffId: row.id })));
    return row;
  });
}

export async function updateStaff(businessId: string, staffId: string, input: StaffInput) {
  const serviceIds = await assertOwnServices(businessId, input.serviceIds);
  await assertOwnPhoto(businessId, input.photoMediaId);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(staff)
      .set({ displayName: input.displayName, title: input.title, bio: input.bio, photoMediaId: input.photoMediaId, isActive: input.isActive })
      .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
      .returning();
    if (!row) throw new DomainError("NOT_FOUND", "Team member not found.");
    await tx.delete(staffServices).where(eq(staffServices.staffId, staffId));
    if (serviceIds.length) await tx.insert(staffServices).values(serviceIds.map((serviceId) => ({ staffId, serviceId })));
    return row;
  });
}

async function assertOwnStaff(businessId: string, staffId: string) {
  const [row] = await db.select({ id: staff.id }).from(staff).where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)));
  if (!row) throw new DomainError("NOT_FOUND", "Team member not found.");
}

/** Replaces the whole week. Input is already validated by `hoursSchema`. */
export async function setWorkingHours(businessId: string, staffId: string, ranges: HoursRange[]) {
  await assertOwnStaff(businessId, staffId);
  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.staffId, staffId));
    if (ranges.length) await tx.insert(workingHours).values(ranges.map((r) => ({ ...r, staffId })));
  });
}

export type TimeOffInput = { startsOn: string; endsOn: string; startTime: string; endTime: string; reason: string | null };

/** Whole days unless times are given; converted from shop wall-clock to UTC. */
export async function addTimeOff(businessId: string, timezone: string, staffId: string, input: TimeOffInput) {
  await assertOwnStaff(businessId, staffId);
  const startsAt = zonedDateTime(input.startsOn, input.startTime || "00:00", timezone);
  const endsAt = input.endTime
    ? zonedDateTime(input.endsOn, input.endTime, timezone)
    : zonedDateTime(nextDay(input.endsOn), "00:00", timezone);
  if (endsAt <= startsAt) throw new DomainError("INVALID_INPUT", "The end must be after the start.");
  const [row] = await db.insert(timeOff).values({ staffId, startsAt, endsAt, reason: input.reason }).returning();
  return row;
}

function nextDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export async function removeTimeOff(businessId: string, timeOffId: string) {
  const rows = await db
    .delete(timeOff)
    .where(and(eq(timeOff.id, timeOffId), inArray(timeOff.staffId, db.select({ id: staff.id }).from(staff).where(eq(staff.businessId, businessId)))))
    .returning({ id: timeOff.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Time off not found.");
}

export async function moveStaff(businessId: string, staffId: string, direction: "up" | "down") {
  const rows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.businessId, businessId))
    .orderBy(asc(staff.sortOrder), asc(staff.displayName));
  const i = rows.findIndex((r) => r.id === staffId);
  if (i < 0) throw new DomainError("NOT_FOUND", "Team member not found.");
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.transaction(async (tx) => {
    for (const [sortOrder, r] of rows.entries()) {
      await tx.update(staff).set({ sortOrder }).where(and(eq(staff.id, r.id), eq(staff.businessId, businessId)));
    }
  });
}

/**
 * Deleting someone with bookings would erase history, so the database
 * refuses (FK restrict) and we suggest hiding them instead.
 */
export async function deleteStaff(businessId: string, staffId: string) {
  try {
    const rows = await db
      .delete(staff)
      .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
      .returning({ id: staff.id });
    if (!rows.length) throw new DomainError("NOT_FOUND", "Team member not found.");
  } catch (err) {
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw new DomainError("CONFLICT", "They have bookings, so they can't be deleted. Turn off “Takes bookings” to hide them instead.");
    }
    throw err;
  }
}
