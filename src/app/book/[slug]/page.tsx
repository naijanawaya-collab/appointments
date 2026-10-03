import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront/storefront";
import { getBusinessBySlug } from "@/lib/tenant";

/** Platform URL for a business: /book/demo-barber */
export async function generateMetadata(props: PageProps<"/book/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const business = await getBusinessBySlug(slug);
  return business ? { title: `Book at ${business.name}` } : {};
}

export default async function BookBySlugPage(props: PageProps<"/book/[slug]">) {
  const { slug } = await props.params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  return <Storefront business={business} />;
}
