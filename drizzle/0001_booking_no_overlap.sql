-- Custom migration: make double-booking impossible at the database level.
--
-- Two ACTIVE bookings (pending/confirmed) for the same professional may not
-- overlap in time. If two customers grab the same slot at the same moment,
-- one insert succeeds and the other fails with SQLSTATE 23P01
-- (exclusion_violation) – the app turns that into "this slot was just taken".
--
-- '[)' = start inclusive, end exclusive, so 10:00-10:30 and 10:30-11:00 do NOT clash.
-- btree_gist is available on Neon and on the official postgres Docker image.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_per_staff"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed'));
