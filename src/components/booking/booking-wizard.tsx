"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { staffForServices, summarizeSelection, type Catalog } from "@/domain/catalog/selection";
import { formatDuration, formatMoney, UI_LOCALE } from "@/lib/format";
import type { CustomerDetails } from "@/validation/booking";
import { ApiError, createBookingRequest, fetchCatalog } from "./api";
import { Confirmation } from "./confirmation";
import { DetailsStep } from "./details-step";
import { ServiceStep } from "./service-step";
import { StaffStep } from "./staff-step";
import { TimeStep } from "./time-step";
import { canAdvance, initialWizardState, STEPS, wizardReducer, type Step } from "./wizard-state";

export type WizardBusiness = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  locale: string;
  maxAdvanceDays: number;
};

type Props = {
  business: WizardBusiness;
  initialCatalog: Catalog;
  /** Injected in tests. */
  now?: Date;
};

const TITLES: Record<Step, string> = {
  services: "Choose services",
  staff: "Choose a professional",
  time: "Pick a time",
  details: "Your details",
  done: "Booking confirmed",
};

/**
 * Fresha-style booking flow on one page: services → professional → time →
 * details → confirmation. State lives in a tested reducer; server data in
 * React Query; the form in React Hook Form.
 */
export function BookingWizard({ business, initialCatalog, now }: Props) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [customerEmail, setCustomerEmail] = useState("");
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const { data: catalog = initialCatalog } = useQuery({
    queryKey: ["catalog", business.id],
    queryFn: () => fetchCatalog(business.id),
    initialData: initialCatalog,
  });

  const summary = useMemo(() => summarizeSelection(catalog, state.serviceIds), [catalog, state.serviceIds]);
  const eligibleStaff = useMemo(() => staffForServices(catalog, state.serviceIds), [catalog, state.serviceIds]);

  const booking = useMutation({
    mutationFn: (details: CustomerDetails) =>
      createBookingRequest(business.id, {
        serviceIds: state.serviceIds,
        staffId: state.staffId,
        startsAt: state.slot!.start,
        customer: details,
      }),
    onSuccess: (confirmation) => {
      dispatch({ type: "confirmed", confirmation });
      queryClient.invalidateQueries({ queryKey: ["availability", business.id] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        dispatch({ type: "slotTaken", message: error.message });
        queryClient.invalidateQueries({ queryKey: ["availability", business.id] });
      }
    },
  });

  // Move focus to the step heading on step changes (screen readers + keyboard users).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  const stepIndex = STEPS.indexOf(state.step);
  const confirmedStaff =
    state.confirmation && catalog.staff.find((s) => s.id === state.confirmation!.staffId)?.displayName;

  return (
    <div className="space-y-6">
      {state.step !== "done" && (
        <ol className="flex gap-1.5" aria-label="Progress">
          {STEPS.slice(0, 4).map((s, i) => (
            <li
              key={s}
              aria-current={s === state.step ? "step" : undefined}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-accent" : "bg-line"}`}
            >
              <span className="sr-only">{TITLES[s]}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-3">
        {stepIndex > 0 && state.step !== "done" && (
          <button
            type="button"
            onClick={() => dispatch({ type: "back" })}
            className="flex size-9 items-center justify-center rounded-full border border-line"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
          {TITLES[state.step]}
        </h2>
      </div>

      {state.step === "services" && (
        <ServiceStep
          catalog={catalog}
          selected={state.serviceIds}
          currency={business.currency}
          locale={business.locale}
          onToggle={(id) => dispatch({ type: "toggleService", id })}
        />
      )}

      {state.step === "staff" && (
        <StaffStep
          staff={eligibleStaff}
          selected={state.staffId}
          onSelect={(id) => dispatch({ type: "selectStaff", id })}
        />
      )}

      {state.step === "time" && (
        <TimeStep
          businessId={business.id}
          timezone={business.timezone}
          locale={UI_LOCALE}
          maxAdvanceDays={business.maxAdvanceDays}
          serviceIds={state.serviceIds}
          staffId={state.staffId}
          date={state.date}
          slot={state.slot}
          notice={state.notice}
          now={now}
          onSelectDate={(date) => dispatch({ type: "selectDate", date })}
          onSelectSlot={(slot) => dispatch({ type: "selectSlot", slot })}
        />
      )}

      {state.step === "details" && (
        <DetailsStep
          error={booking.isError && !(booking.error instanceof ApiError && booking.error.status === 409) ? booking.error.message : null}
          onSubmit={(details) => {
            setCustomerEmail(details.email);
            booking.mutate(details);
          }}
        />
      )}

      {state.step === "done" && state.confirmation && (
        <Confirmation
          businessName={business.name}
          timezone={business.timezone}
          locale={business.locale}
          currency={business.currency}
          startsAt={state.confirmation.startsAt}
          staffName={confirmedStaff ?? "Your professional"}
          services={summary.services.map((s) => s.name)}
          durationMin={summary.durationMin}
          priceCents={summary.priceCents}
          manageUrl={state.confirmation.manageUrl}
          email={customerEmail}
          onBookAnother={() => {
            booking.reset();
            dispatch({ type: "reset" });
          }}
        />
      )}

      {state.step !== "done" && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface/95 p-4 shadow-sm backdrop-blur">
          <div className="text-sm" aria-live="polite">
            {state.serviceIds.length === 0 ? (
              <span className="text-muted">Select at least one service</span>
            ) : (
              <>
                <span className="font-medium">{formatMoney(summary.priceCents, business.currency, business.locale)}</span>
                <span className="text-muted"> · {formatDuration(summary.durationMin)}</span>
              </>
            )}
          </div>
          {state.step === "details" ? (
            <button
              type="submit"
              form="booking-details"
              disabled={booking.isPending}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {booking.isPending ? "Booking…" : "Confirm booking"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "next" })}
              disabled={!canAdvance(state)}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-40"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
