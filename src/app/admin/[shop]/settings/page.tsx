import type { Metadata } from "next";
import { listMembers, listReviews } from "@/domain/business/admin";
import { DetailsForm } from "@/components/admin/details-form";
import { People, Reviews } from "@/components/admin/people";
import { requireShop } from "@/lib/authz";

export const metadata: Metadata = { title: "Settings" };

const s = (v: string | null | undefined) => v ?? "";

export default async function SettingsPage({ params }: PageProps<"/admin/[shop]/settings">) {
  const ctx = await requireShop((await params).shop, "owner");
  const b = ctx.business;
  const [members, reviews] = await Promise.all([listMembers(b.id), listReviews(b.id)]);

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Settings</h1>
        </div>
      </header>
      <DetailsForm
        businessId={b.id}
        defaults={{
          name: b.name,
          shortName: s(b.shortName),
          mark: s(b.mark),
          eyebrow: s(b.eyebrow),
          tagline: s(b.tagline),
          description: s(b.description),
          aboutTitle: s(b.aboutTitle),
          about: s(b.about),
          address: s(b.address),
          lat: b.lat === null ? "" : String(b.lat),
          lon: b.lon === null ? "" : String(b.lon),
          phone: s(b.phone),
          email: s(b.email),
          whatsapp: b.whatsapp && b.whatsapp !== b.phone ? b.whatsapp : "",
          instagram: s(b.instagram),
          tiktok: s(b.tiktok),
          ratingValue: b.ratingValue === null ? "" : String(b.ratingValue),
          ratingCount: b.ratingCount === null ? "" : String(b.ratingCount),
          legalNotice: s(b.legalNotice),
          timezone: b.timezone,
          slotIntervalMin: String(b.slotIntervalMin),
          minLeadTimeMin: String(b.minLeadTimeMin),
          maxAdvanceDays: String(b.maxAdvanceDays),
          cancellationWindowHours: String(b.cancellationWindowHours),
        }}
      />
      <Reviews businessId={b.id} reviews={reviews} />
      <People businessId={b.id} me={ctx.userId} members={members} />
    </>
  );
}
