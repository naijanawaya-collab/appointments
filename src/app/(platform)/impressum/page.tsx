import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, PLATFORM_NAME, PLATFORM_OPERATOR } from "@/lib/platform";

export const metadata: Metadata = { title: "Impressum" };

/**
 * Impressum for the platform itself (§ 5 ECG / § 25 MedienG). Each shop has
 * its own on its storefront (/<shop>/legal). Filled from PLATFORM_OPERATOR_*
 * settings; missing details are flagged instead of silently left out.
 */
export default function ImpressumPage() {
  const missing = !PLATFORM_OPERATOR.name || !PLATFORM_OPERATOR.address || !CONTACT_EMAIL;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 text-[15px] leading-relaxed">
      <Link href="/" className="text-sm text-muted underline underline-offset-4">
        ← {PLATFORM_NAME}
      </Link>
      <h1 className="display mt-6 text-4xl">Impressum</h1>
      {missing && (
        <p className="mt-4 rounded-lg border border-line p-3 text-sm" role="note">
          The operator’s details are not complete yet (set PLATFORM_OPERATOR_NAME, PLATFORM_OPERATOR_ADDRESS and NEXT_PUBLIC_CONTACT_EMAIL).
        </p>
      )}
      <dl className="mt-4 grid gap-1">
        <dt className="font-semibold">Operator of {PLATFORM_NAME}</dt>
        {PLATFORM_OPERATOR.name && <dd>{PLATFORM_OPERATOR.name}</dd>}
        {PLATFORM_OPERATOR.address && <dd className="whitespace-pre-line">{PLATFORM_OPERATOR.address}</dd>}
        {CONTACT_EMAIL && (
          <dd>
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </dd>
        )}
      </dl>
      <p className="mt-6 text-muted">
        Each shop on {PLATFORM_NAME} is responsible for its own storefront and bookings; its contact details are on that shop’s page under
        “Impressum”.
      </p>
    </main>
  );
}
