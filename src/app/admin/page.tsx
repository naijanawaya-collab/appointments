import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessDomains } from "@/db/schema";
import { getCatalogCached } from "@/lib/tenant";
import { getMyBusinesses, requireSession } from "@/lib/session";
import { formatDuration, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Phase 0 dashboard: proves auth + tenancy end to end.
 * Calendar, bookings, and CRUD for services/staff/hours arrive in Phase 2.
 */
export default async function AdminHomePage() {
  const session = await requireSession();
  const memberships = await getMyBusinesses(session.user.id);

  if (memberships.length === 0) {
    return <p className="text-muted">Your account isn&apos;t linked to any business yet.</p>;
  }

  return (
    <div className="space-y-10">
      {await Promise.all(
        memberships.map(async ({ business, role }) => {
          const [catalog, domains] = await Promise.all([
            getCatalogCached(business.id),
            db.select().from(businessDomains).where(eq(businessDomains.businessId, business.id)),
          ]);
          return (
            <section key={business.id} className="rounded-xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
                  <p className="text-sm text-muted">
                    {role} · {business.timezone} · {business.currency}
                  </p>
                </div>
                <Link
                  href={`/book/${business.slug}`}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  Open booking page ↗
                </Link>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Platform URL</dt>
                  <dd className="font-mono">/book/{business.slug}</dd>
                </div>
                <div>
                  <dt className="text-muted">Custom domains</dt>
                  <dd className="font-mono">
                    {domains.length ? domains.map((d) => d.hostname).join(", ") : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="mb-2 font-medium">Services ({catalog.services.length})</h2>
                  <ul className="space-y-1 text-sm">
                    {catalog.services.map((s) => (
                      <li key={s.id} className="flex justify-between gap-2">
                        <span>{s.name}</span>
                        <span className="text-muted">
                          {formatDuration(s.durationMin)} ·{" "}
                          {formatMoney(s.priceCents, business.currency, business.locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="mb-2 font-medium">Team ({catalog.staff.length})</h2>
                  <ul className="space-y-1 text-sm">
                    {catalog.staff.map((s) => (
                      <li key={s.id}>
                        {s.displayName}
                        {s.title && <span className="text-muted"> · {s.title}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        }),
      )}
    </div>
  );
}
