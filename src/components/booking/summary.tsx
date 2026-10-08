"use client";

import { formatDuration, formatMoney } from "@/lib/format";

export type SummaryData = {
  items: { id: string; name: string; durationMin: number; priceCents: number }[];
  durationMin: number;
  priceCents: number;
  staffLabel: string;
  whenLabel: string | null;
  currency: string;
  locale: string;
};

type ActionProps = {
  label: string;
  disabled: boolean;
  busy: boolean;
  /** Submits the details form when set; otherwise calls onClick. */
  formId?: string;
  onClick?: () => void;
};

/**
 * Rendered with a different `key` for "Continue" and "Confirm booking" (see
 * callers): if React re-used one element, clicking Continue would re-render
 * it into the details form's submit button *during* the click, and the
 * browser would then submit the form (booking without showing the details).
 */
function PrimaryButton({ label, disabled, busy, formId, onClick }: ActionProps) {
  return (
    <button
      type={formId ? "submit" : "button"}
      form={formId}
      className="btn btn-primary bk-cta"
      aria-disabled={disabled || busy}
      aria-busy={busy}
      onClick={(e) => {
        if (disabled || busy) {
          e.preventDefault(); // aria-disabled keeps it focusable for screen readers (B-2)
          return;
        }
        onClick?.();
      }}
    >
      {busy && <span className="spinner" aria-hidden />}
      {busy ? "Booking…" : label}
    </button>
  );
}

/** Desktop (≥ 960 px container): sticky card next to the steps. */
export function SummaryAside({ data, action }: { data: SummaryData; action: ActionProps }) {
  const money = (c: number) => formatMoney(c, data.currency, data.locale);
  return (
    <aside className="bk-aside" aria-label="Your booking">
      <strong className="text-[15px]">Your booking</strong>
      {data.items.length === 0 ? (
        <span className="bk-meta">Select at least one service</span>
      ) : (
        <>
          {data.items.map((i) => (
            <div key={i.id} className="bk-aside-item">
              <span className="flex flex-col">
                <span className="font-medium">{i.name}</span>
                <span className="bk-meta">{formatDuration(i.durationMin)}</span>
              </span>
              <span className="tabular">{money(i.priceCents)}</span>
            </div>
          ))}
          <div className="bk-aside-item border-t border-line pt-3">
            <span className="text-muted">With</span>
            <span>{data.staffLabel}</span>
          </div>
          {data.whenLabel && (
            <div className="bk-aside-item">
              <span className="text-muted">When</span>
              <span>{data.whenLabel}</span>
            </div>
          )}
        </>
      )}
      <div className="bk-aside-total" aria-live="polite">
        <span className="bk-meta">Total · {formatDuration(data.durationMin)}</span>
        <strong>{money(data.priceCents)}</strong>
      </div>
      <PrimaryButton key={action.formId ? "submit" : "next"} {...action} />
    </aside>
  );
}

/** Mobile: fixed bottom bar with the running total. */
export function SummaryBar({ data, action }: { data: SummaryData; action: ActionProps }) {
  const n = data.items.length;
  return (
    <div className="bk-bar">
      <div className="bk-bar-total" aria-live="polite">
        {n === 0 ? (
          <span className="bk-meta">Select at least one service</span>
        ) : (
          <>
            <strong>{formatMoney(data.priceCents, data.currency, data.locale)}</strong>
            <span className="bk-meta">
              {formatDuration(data.durationMin)} · {n} service{n > 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>
      <PrimaryButton key={action.formId ? "submit" : "next"} {...action} />
    </div>
  );
}
