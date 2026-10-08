import type { Metadata } from "next";
import { listDomains, storedStatus } from "@/domain/domains/service";
import { DomainPanel } from "@/components/admin/domain-panel";
import { requireShop } from "@/lib/authz";
import { PLATFORM_URL } from "@/lib/platform";

export const metadata: Metadata = { title: "Domain" };

export default async function DomainPage({ params }: PageProps<"/admin/[shop]/domain">) {
  const ctx = await requireShop((await params).shop, "owner");
  const domains = await listDomains(ctx.business.id);
  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Domain</h1>
        </div>
      </header>
      <DomainPanel
        businessId={ctx.business.id}
        initial={domains.map(storedStatus)}
        automatic={Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)}
        platformUrl={`${PLATFORM_URL}/${ctx.business.slug}`}
      />
    </>
  );
}
