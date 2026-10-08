import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { moveStaffAction } from "@/app/admin/_actions/team";
import { listServices } from "@/domain/catalog/admin";
import { listStaff } from "@/domain/team/admin";
import { ActionButton } from "@/components/admin/form-kit";
import { adminHref } from "@/components/admin/nav";
import { requireShop } from "@/lib/authz";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/admin/[shop]/team">) {
  const ctx = await requireShop((await params).shop, "owner");
  const [team, services] = await Promise.all([listStaff(ctx.business.id), listServices(ctx.business.id)]);
  const base = adminHref(ctx.business.slug, "/team");

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Team</h1>
        </div>
        <div className="ad-actions">
          <Link href={`${base}/new`} className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Add professional
          </Link>
        </div>
      </header>
      {team.length === 0 ? (
        <p className="ad-empty">No one on the team yet. Add yourself first; customers book a professional.</p>
      ) : (
        <ul className="ad-list">
          {team.map((t, i) => (
            <li key={t.id} className="ad-row">
              {t.photo ? (
                <Image src={t.photo.src} alt="" width={44} height={44} className="ad-avatar" style={{ objectPosition: t.photo.position }} />
              ) : (
                <span className="ad-avatar" aria-hidden="true">
                  {t.displayName.charAt(0)}
                </span>
              )}
              <span className="ad-row-main">
                <Link href={`${base}/${t.id}`} className="ad-row-title">
                  {t.displayName}
                </Link>
                <span className="ad-row-meta">
                  {[t.title, `${t.serviceIds.length} of ${services.length} services`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="ad-row-side">
                {!t.isActive && <span className="pill pill-neutral">Not bookable</span>}
                <ActionButton disabled={i === 0} action={moveStaffAction.bind(null, ctx.business.id, t.id, "up")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${t.displayName} up`}>
                  <ArrowUp size={16} aria-hidden="true" />
                </ActionButton>
                <ActionButton disabled={i === team.length - 1} action={moveStaffAction.bind(null, ctx.business.id, t.id, "down")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${t.displayName} down`}>
                  <ArrowDown size={16} aria-hidden="true" />
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
