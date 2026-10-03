"use client";

import { formatDuration, formatMoney, UI_LOCALE } from "@/lib/format";
import { formatLongDateTime } from "./dates";

type Props = {
  businessName: string;
  timezone: string;
  locale: string;
  currency: string;
  startsAt: string;
  staffName: string;
  services: string[];
  durationMin: number;
  priceCents: number;
  manageUrl: string;
  email: string;
  onBookAnother: () => void;
};

export function Confirmation(p: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="text-sm text-muted">You&apos;re booked at {p.businessName}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{formatLongDateTime(p.startsAt, p.timezone, UI_LOCALE)}</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">With</dt>
            <dd>{p.staffName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Services</dt>
            <dd className="text-right">{p.services.join(", ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Duration</dt>
            <dd>{formatDuration(p.durationMin)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Price</dt>
            <dd className="font-medium">{formatMoney(p.priceCents, p.currency, p.locale)}</dd>
          </div>
        </dl>
      </div>

      <p className="text-sm text-muted">
        A confirmation is on its way to <span className="text-foreground">{p.email}</span>.
      </p>

      <div className="flex flex-wrap gap-3">
        <a href={p.manageUrl} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
          Manage or cancel
        </a>
        <button type="button" onClick={p.onBookAnother} className="rounded-lg px-4 py-2 text-sm font-medium underline">
          Book another appointment
        </button>
      </div>
    </div>
  );
}
