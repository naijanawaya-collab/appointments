import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { removeTimeOffAction, saveWorkingHoursAction } from "@/app/admin/_actions/team";
import { localDateString } from "@/domain/availability/compute-slots";
import { listServices } from "@/domain/catalog/admin";
import { isDomainError } from "@/domain/errors";
import { getStaffMember } from "@/domain/team/admin";
import { TimeOffForm } from "@/components/admin/date-range-forms";
import { ActionButton } from "@/components/admin/form-kit";
import { HoursEditor } from "@/components/admin/hours-editor";
import { adminHref } from "@/components/admin/nav";
import { StaffForm } from "@/components/admin/staff-form";
import { requireShop } from "@/lib/authz";
import { clockTime, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Team member" };

export default async function StaffPage({ params }: PageProps<"/admin/[shop]/team/[id]">) {
  const { shop, id } = await params;
  const ctx = await requireShop(shop, "owner");
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getStaffMember(ctx.business.id, id).catch((err) => {
    if (isDomainError(err)) notFound();
    throw err;
  });
  const services = await listServices(ctx.business.id);
  const { member, hours, timeOff } = data;
  const tz = ctx.business.timezone;
  const businessId = ctx.business.id;
  const when = (d: Date) => `${shortDate(d, tz)} ${clockTime(d, tz)}`;

  return (
    <>
      <Link href={adminHref(ctx.business.slug, "/team")} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Team
      </Link>
      <h1 className="ad-title">{member.displayName}</h1>
      <StaffForm
        businessId={businessId}
        slug={ctx.business.slug}
        staffId={member.id}
        photo={member.photo}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        defaults={{
          displayName: member.displayName,
          title: member.title ?? "",
          bio: member.bio ?? "",
          photoMediaId: member.photoMediaId ?? "",
          isActive: member.isActive,
          serviceIds: member.serviceIds,
        }}
      />

      <section className="ad-card" aria-labelledby="wh-title">
        <h2 id="wh-title">Working hours</h2>
        <p className="ad-card-intro">When {member.displayName} can be booked. Times are in {tz.replace("_", " ")}.</p>
        <HoursEditor initial={hours} onSave={async (ranges) => {
          "use server";
          return saveWorkingHoursAction(businessId, member.id, ranges);
        }} />
      </section>

      <section className="ad-card" aria-labelledby="off-title">
        <h2 id="off-title">Time off</h2>
        <p className="ad-card-intro">Holidays, appointments, sick days. Nobody can book them during this time.</p>
        {timeOff.length > 0 && (
          <ul className="ad-list" style={{ marginBottom: 16 }}>
            {timeOff.map((t) => (
              <li key={t.id} className="ad-row">
                <span className="ad-row-main">
                  <span className="ad-row-title tabular">
                    {when(t.startsAt)} – {when(t.endsAt)}
                  </span>
                  {t.reason && <span className="ad-row-meta">{t.reason}</span>}
                </span>
                <ActionButton action={removeTimeOffAction.bind(null, businessId, t.id)} className="btn btn-link" confirm="Remove this time off?" confirmLabel="Remove">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
        <TimeOffForm businessId={businessId} staffId={member.id} today={localDateString(new Date(), tz)} />
      </section>
    </>
  );
}
