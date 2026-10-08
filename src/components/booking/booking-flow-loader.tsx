"use client";

import dynamic from "next/dynamic";
import { Providers } from "@/components/providers";
import type { Catalog } from "@/domain/catalog/selection";
import type { FlowBusiness } from "./types";

/**
 * Booking needs JavaScript (BEHAVIOUR §5.12), and starting from the URL +
 * saved session is simplest in the browser, so the flow renders client-only.
 * The server still renders the shell (header + skeleton) for a fast first paint.
 */
const BookingFlow = dynamic(() => import("./booking-flow").then((m) => m.BookingFlow), {
  ssr: false,
  loading: () => <BookingSkeleton />,
});

type Props = { business: FlowBusiness; catalog: Catalog; address: string | null; homeHref: string };

export function BookingFlowLoader(props: Props) {
  return (
    <Providers>
      <BookingFlow {...props} />
    </Providers>
  );
}

function BookingSkeleton() {
  return (
    <div className="bk" aria-busy="true" aria-label="Loading booking">
      <div className="bk-header" />
      <div className="bk-body">
        <div className="bk-main">
          <div className="skel" style={{ height: 4, borderRadius: 2 }} />
          <div className="skel" style={{ height: 32, width: 220, borderRadius: 6 }} />
          <div className="skel" style={{ height: 320, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
