import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { listServices } from "@/domain/catalog/admin";
import { adminHref } from "@/components/admin/nav";
import { StaffForm } from "@/components/admin/staff-form";
import { requireShop } from "@/lib/authz";

export const metadata: Metadata = { title: "Add professional" };

export default async function NewStaffPage({ params }: PageProps<"/admin/[shop]/team/new">) {
  const ctx = await requireShop((await params).shop, "owner");
  const services = await listServices(ctx.business.id);
  return (
    <>
      <Link href={adminHref(ctx.business.slug, "/team")} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Team
      </Link>
      <h1 className="ad-title">Add professional</h1>
      <p className="ad-card-intro">They start with the shop’s opening hours; you can change their hours after saving.</p>
      <StaffForm
        businessId={ctx.business.id}
        slug={ctx.business.slug}
        staffId={null}
        photo={null}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        defaults={{ displayName: "", title: "", bio: "", photoMediaId: "", isActive: true, serviceIds: services.filter((s) => s.isActive).map((s) => s.id) }}
      />
    </>
  );
}
