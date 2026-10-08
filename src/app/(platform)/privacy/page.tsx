import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, PLATFORM_NAME, PLATFORM_OPERATOR } from "@/lib/platform";

export const metadata: Metadata = { title: "Privacy" };

/**
 * Privacy notice for the platform (owners' accounts and how bookings are
 * processed on behalf of shops). Plain-language starting point: have it
 * reviewed before launch, it is not legal advice.
 */
export default function PrivacyPage() {
  const who = PLATFORM_OPERATOR.name || `the operator of ${PLATFORM_NAME}`;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 text-[15px] leading-relaxed">
      <Link href="/" className="text-sm text-muted underline underline-offset-4">
        ← {PLATFORM_NAME}
      </Link>
      <h1 className="display mt-6 text-4xl">Privacy</h1>
      <div className="mt-6 space-y-4">
        <p>
          {PLATFORM_NAME} is run by {who}. This notice explains what happens with personal data on this website and on the shops’ booking
          pages.
        </p>
        <h2 className="text-xl font-semibold">Booking an appointment</h2>
        <p>
          When you book with a shop, the shop is responsible for your data (name, email, optional phone number and note, appointment details).
          {` ${PLATFORM_NAME}`} processes it on the shop’s behalf only to show availability, store the booking and send confirmation, cancellation
          and reminder emails. Each shop’s own notice is on its page under “Impressum &amp; Privacy”.
        </p>
        <h2 className="text-xl font-semibold">Business accounts</h2>
        <p>
          For shop owners and staff we store name, email address and a hashed password, plus a session cookie while you’re signed in. That
          cookie is strictly necessary, so no consent banner is needed. We don’t use advertising or tracking cookies.
        </p>
        <h2 className="text-xl font-semibold">Service providers</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel (hosting, EU region Frankfurt)</li>
          <li>Neon (database, EU region Frankfurt)</li>
          <li>Resend (sending emails)</li>
          <li>Cloudinary (storing and delivering shop photos)</li>
          <li>OpenStreetMap (the map on a shop’s page, loaded only when you scroll to it)</li>
        </ul>
        <h2 className="text-xl font-semibold">Your rights</h2>
        <p>
          You can ask for access to, correction or deletion of your data, or object to its processing
          {CONTACT_EMAIL ? (
            <>
              {" "}
              by writing to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </>
          ) : null}
          . You can also complain to the Austrian data protection authority (Datenschutzbehörde).
        </p>
      </div>
    </main>
  );
}
