import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { listCategories } from "@/domain/catalog/admin";
import { listStaff } from "@/domain/team/admin";
import { adminHref } from "@/components/admin/nav";
import { ServiceForm } from "@/components/admin/service-form";
import { requireShop } from "@/lib/authz";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage({ params }: PageProps<"/admin/[shop]/services/new">) {
  const ctx = await requireShop((await params).shop, "owner");
  const [categories, team] = await Promise.all([listCategories(ctx.business.id), listStaff(ctx.business.id)]);
  const active = team.filter((t) => t.isActive);
  return (
    <>
      <Link href={adminHref(ctx.business.slug, "/services")} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Services
      </Link>
      <h1 className="ad-title">New service</h1>
      <ServiceForm
        businessId={ctx.business.id}
        slug={ctx.business.slug}
        serviceId={null}
        image={null}
        categories={categories}
        team={active.map((t) => ({ id: t.id, name: t.displayName }))}
        defaults={{ name: "", description: "", categoryId: categories[0]?.id ?? "", durationMin: "30", bufferMin: "0", price: "", isActive: true, imageMediaId: "", staffIds: active.map((t) => t.id) }}
      />
    </>
  );
}
