import type { Metadata } from "next";
import { removeClosureAction, saveOpeningHoursAction } from "@/app/admin/_actions/hours";
import { localDateString } from "@/domain/availability/compute-slots";
import { getOpeningHours, listClosures } from "@/domain/hours/admin";
import { ClosureForm } from "@/components/admin/date-range-forms";
import { ActionButton } from "@/components/admin/form-kit";
import { HoursEditor } from "@/components/admin/hours-editor";
import { requireShop } from "@/lib/authz";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Opening hours" };

export default async function HoursPage({ params }: PageProps<"/admin/[shop]/hours">) {
  const ctx = await requireShop((await params).shop, "owner");
  const tz = ctx.business.timezone;
  const today = localDateString(new Date(), tz);
  const businessId = ctx.business.id;
  const [hours, closures] = await Promise.all([getOpeningHours(businessId), listClosures(businessId, today)]);
  const day = (d: string) => shortDate(new Date(`${d}T12:00:00Z`), "UTC");

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Opening hours</h1>
        </div>
      </header>
      <section className="ad-card" aria-labelledby="oh-title">
        <h2 id="oh-title">Weekly hours</h2>
        <p className="ad-card-intro">Shown on your storefront. Bookable times come from each professional’s working hours, so tick the box to copy these to the team.</p>
        <HoursEditor
          initial={hours}
          extra="Also set these hours for the whole team"
          onSave={async (ranges, applyToTeam) => {
            "use server";
            return saveOpeningHoursAction(businessId, ranges, applyToTeam);
          }}
        />
      </section>
      <section className="ad-card" aria-labelledby="cl-title">
        <h2 id="cl-title">Closures &amp; holidays</h2>
        <p className="ad-card-intro">No one can book on these days, and your storefront shows the note.</p>
        {closures.length > 0 && (
          <ul className="ad-list" style={{ marginBottom: 16 }}>
            {closures.map((c) => (
              <li key={c.id} className="ad-row">
                <span className="ad-row-main">
                  <span className="ad-row-title">{c.startsOn === c.endsOn ? day(c.startsOn) : `${day(c.startsOn)} – ${day(c.endsOn)}`}</span>
                  {c.label && <span className="ad-row-meta">{c.label}</span>}
                </span>
                <ActionButton action={removeClosureAction.bind(null, businessId, c.id)} className="btn btn-link" confirm="Remove this closure?" confirmLabel="Remove">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
        <ClosureForm businessId={businessId} today={today} />
      </section>
    </>
  );
}
