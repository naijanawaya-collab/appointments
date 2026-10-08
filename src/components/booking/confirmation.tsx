"use client";

import { CalendarPlus, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { clockTime, formatDuration, formatMoney, longDate } from "@/lib/format";
import { popIn } from "@/lib/motion";

type Props = {
  shopName: string;
  timezone: string;
  currency: string;
  locale: string;
  startsAt: string;
  staffName: string;
  services: string[];
  durationMin: number;
  priceCents: number;
  address: string | null;
  manageUrl: string;
  email: string;
  onBookAnother: () => void;
};

/** Step 5 (B-20…B-22). */
export function Confirmation(p: Props) {
  const check = useRef<HTMLSpanElement>(null);
  useEffect(() => popIn(check.current), []); // M-14
  const start = new Date(p.startsAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="bk-done">
        <div className="bk-done-head">
          <p className="m-0 flex items-center gap-2 font-semibold">
            <span ref={check} className="bk-done-check" aria-hidden>
              <Check size={14} strokeWidth={3} />
            </span>
            You’re booked at {p.shopName}
          </p>
          <p className="display bk-done-time m-0">{clockTime(start, p.timezone)}</p>
          <p className="bk-done-date m-0">{longDate(start, p.timezone)}</p>
        </div>
        <dl className="bk-dl">
          <div>
            <dt>With</dt>
            <dd>{p.staffName}</dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd>{p.services.join(", ")}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(p.durationMin)}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd className="font-semibold">{formatMoney(p.priceCents, p.currency, p.locale)}</dd>
          </div>
          {p.address && (
            <div>
              <dt>Where</dt>
              <dd>{p.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="m-0 text-muted">
        A confirmation is on its way to <span className="text-foreground">{p.email}</span>.
      </p>

      <div className="mb-actions">
        <a href={p.manageUrl} className="btn btn-primary btn-md">
          Manage or cancel
        </a>
        <a href={`${p.manageUrl}/calendar.ics`} className="btn btn-secondary btn-md" download="booking.ics">
          <CalendarPlus size={16} aria-hidden />
          Add to calendar
        </a>
        <button type="button" className="btn btn-link" onClick={p.onBookAnother}>
          Book another
        </button>
      </div>
    </div>
  );
}
