<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions (appointments platform)

- **Multi-tenant from day one.** Every tenant-owned table has `business_id`; every query filters by it. Admin mutations call `assertMember(userId, businessId)` first (`src/lib/session.ts`).
- **Tenant resolution** happens in one place: `src/domain/business/resolve-business.ts`. Pages receive a `Business` and never care whether it came from `/book/[slug]` or a custom domain.
- **`src/proxy.ts`** (Next 16's renamed middleware) only rewrites custom-domain requests to `/sites/[host]`. It must never query the database.
- **`src/domain/**`** holds business logic. No React or Next.js imports there. Files that touch the DB must not be imported from client components; pure logic lives in separate files (e.g. `catalog/selection.ts`).
- **Times:** store `timestamptz` (UTC). Working hours are wall-clock times in the business timezone. Money is integer cents.
- **Double booking** is prevented by the `bookings_no_overlap_per_staff` exclusion constraint (`drizzle/0001_booking_no_overlap.sql`). Catch SQLSTATE `23P01` and show "slot just taken".
- **Booking status changes** go through `assertTransition` in `src/domain/booking/status.ts`.
- **Schema changes:** edit `src/db/schema/*`, then `pnpm db:generate --name <change>` and `pnpm db:migrate`. Never edit an applied migration.
