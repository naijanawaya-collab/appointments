"use server";

import { addDomain, checkDomains, removeDomain, setPrimaryDomain, type DomainDeps } from "@/domain/domains/service";
import { vercelFromEnv } from "@/domain/domains/vercel";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { PLATFORM_URL } from "@/lib/platform";
import { changed } from "./shared";

function deps(): DomainDeps {
  const hosts = (process.env.PLATFORM_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return { vercel: vercelFromEnv(), platformHosts: [...hosts, new URL(PLATFORM_URL).hostname] };
}

export async function addDomainAction(businessId: string, raw: { hostname: string }) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await addDomain(businessId, String(raw.hostname ?? ""), deps());
    const statuses = await checkDomains(businessId, deps());
    changed(businessId);
    return statuses;
  }, "Domain added. Now set the DNS records below at your domain provider.");
}

export async function checkDomainsAction(businessId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const statuses = await checkDomains(businessId, deps());
    changed(businessId);
    return statuses;
  });
}

export async function setPrimaryDomainAction(businessId: string, domainId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await setPrimaryDomain(businessId, domainId);
    changed(businessId);
    return null;
  });
}

export async function removeDomainAction(businessId: string, domainId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await removeDomain(businessId, domainId, deps());
    changed(businessId);
    return null;
  });
}
