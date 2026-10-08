import { notFound, permanentRedirect } from "next/navigation";
import { getBookingByToken } from "@/domain/booking/get-booking";

/** Old manage links from Phase 1 emails: /manage/<token> → /<slug>/b/<token>. */
export default async function LegacyManageRedirect(props: PageProps<"/manage/[token]">) {
  const { token } = await props.params;
  const booking = await getBookingByToken(token);
  if (!booking) notFound();
  permanentRedirect(`/${booking.business.slug}/b/${token}`);
}
