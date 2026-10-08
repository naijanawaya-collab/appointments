import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getService, listCategories } from "@/domain/catalog/admin";
import { isDomainError } from "@/domain/errors";
import { getMediaView } from "@/domain/media/service";
import { listStaff } from "@/domain/team/admin";
import { adminHref } from "@/components/admin/nav";
import { ServiceForm } from "@/components/admin/service-form";
import { requireShop } from "@/lib/authz";
import { centsToInput } from "@/validation/admin";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: PageProps<"/admin/[shop]/services/[id]">) {
  const { shop, id } = await params;
  const ctx = await requireShop(shop, "owner");
  if (!z.uuid().safeParse(id).success) notFound();
  const service = await getService(ctx.business.id, id).catch((err) => {
    if (isDomainError(err)) notFound();
    throw err;
  });
  const [categories, team, image] = await Promise.all([listCategories(ctx.business.id), listStaff(ctx.business.id), getMediaView(ctx.business.id, service.imageMediaId)]);
  return (
    <>
      <Link href={adminHref(ctx.business.slug, "/services")} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Services
      </Link>
      <h1 className="ad-title">{service.name}</h1>
      <ServiceForm
        businessId={ctx.business.id}
        slug={ctx.business.slug}
        serviceId={service.id}
        image={image}
        categories={categories}
        team={team.filter((t) => t.isActive || service.staffIds.includes(t.id)).map((t) => ({ id: t.id, name: t.displayName }))}
        defaults={{
          name: service.name,
          description: service.description ?? "",
          categoryId: service.categoryId ?? "",
          durationMin: String(service.durationMin),
          bufferMin: String(service.bufferMin),
          price: centsToInput(service.priceCents),
          isActive: service.isActive,
          imageMediaId: service.imageMediaId ?? "",
          staffIds: service.staffIds,
        }}
      />
    </>
  );
}
