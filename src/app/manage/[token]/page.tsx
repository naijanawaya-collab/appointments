import type { Metadata } from "next";
import { ManageBooking } from "@/components/manage/manage-booking";

// The URL contains a secret token: keep it out of search engines and referrers.
export const metadata: Metadata = {
  title: "Manage booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ManagePage(props: PageProps<"/manage/[token]">) {
  const { token } = await props.params;
  return <ManageBooking token={token} />;
}
