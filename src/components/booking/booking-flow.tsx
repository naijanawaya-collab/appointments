"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ShopMark } from "@/components/site/shop-mark";
import { staffForServices, summarizeSelection, type Catalog } from "@/domain/catalog/selection";
import { clockTime, shortDate } from "@/lib/format";
import { useStepTransition } from "@/lib/motion";
import type { CustomerDetails } from "@/validation/booking";
import { ApiError, createBookingRequest, newIdempotencyKey } from "./api";
import { Confirmation } from "./confirmation";
import { DETAILS_FORM_ID, DetailsStep } from "./details-step";
import { ServiceStep } from "./service-step";
import { StaffStep } from "./staff-step";
import { SummaryAside, SummaryBar, type SummaryData } from "./summary";
import { TimeStep } from "./time-step";
import type { FlowBusiness } from "./types";
import {
  ALL_STEPS,
  canAdvance,
  initialState,
  isReachable,
  persistable,
  progressSteps,
  stepsFor,
  wizardReducer,
  type Details,
  type Step,
  type WizardState,
} from "./wizard-state";

const TITLES: Record<Step, string> = {
  services: "Choose services",
  staff: "Choose a professional",
  time: "Pick a time",
  details: "Your details",
  done: "Booking confirmed",
};

type Props = {
  business: FlowBusiness;
  catalog: Catalog;
  address: string | null;
  /** Storefront URL (Back from the confirmation goes here, B-22). */
  homeHref: string;
  /** Injected in tests. */
  now?: Date;
};

const storageKey = (shopId: string) => `bk:${shopId}`;

function readSaved(shopId: string): Partial<WizardState> | null {
  try {
    const raw = sessionStorage.getItem(storageKey(shopId));
    return raw ? (JSON.parse(raw) as Partial<WizardState>) : null;
  } catch {
    return null;
  }
}

/**
 * The booking flow (SCREENS.md §2): one page, five steps. Rendered only in
 * the browser (booking needs JavaScript), so it can start from the URL
 * (?service=, ?staff=, ?step=) and the saved session without hydration
 * mismatches.
 */
export function BookingFlow({ business, catalog, address, homeHref, now }: Props) {
  const steps = useMemo(() => stepsFor(catalog.staff.length), [catalog.staff.length]);
  const progress = progressSteps(steps);
  const queryClient = useQueryClient();

  const [state, dispatch] = useReducer(wizardReducer, undefined, () => {
    const params = new URLSearchParams(window.location.search);
    return initialState({
      saved: readSaved(business.id),
      service: params.get("service"),
      staff: params.get("staff"),
      validServiceIds: new Set(catalog.services.map((s) => s.id)),
      validStaffIds: new Set(catalog.staff.map((s) => s.id)),
    });
  });

  /* ---- persistence: reload keeps progress (cleared when done) ---- */
  useEffect(() => {
    try {
      if (state.step === "done") sessionStorage.removeItem(storageKey(business.id));
      else sessionStorage.setItem(storageKey(business.id), JSON.stringify(persistable(state)));
    } catch {
      /* storage unavailable */
    }
  }, [state, business.id]);

  /* ---- URL ?step= ↔ browser Back (B-24, B-22) ---- */
  const lastStep = useRef<Step | null>(null);
  /** History entries this flow pushed; UI Back uses history.back() only while > 0. */
  const pushed = useRef(0);
  /** Set while a step change comes from the browser's Back/Forward (the URL is already right). */
  const fromPop = useRef(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (lastStep.current === null) {
      url.searchParams.set("step", state.step);
      window.history.replaceState({ step: state.step }, "", url);
    } else if (fromPop.current) {
      fromPop.current = false;
    } else if (lastStep.current !== state.step) {
      url.searchParams.set("step", state.step);
      url.searchParams.delete("service");
      url.searchParams.delete("staff");
      const forward = ALL_STEPS.indexOf(state.step) > ALL_STEPS.indexOf(lastStep.current);
      // The confirmation replaces the details entry, so Back can't resubmit.
      if (state.step === "done") window.history.replaceState({ step: state.step }, "", url);
      else if (forward) {
        window.history.pushState({ step: state.step }, "", url);
        pushed.current += 1;
      }
      else window.history.replaceState({ step: state.step }, "", url);
    }
    lastStep.current = state.step;
  }, [state.step]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const onPop = () => {
      const current = stateRef.current;
      if (current.step === "done") {
        window.location.assign(homeHref); // B-22
        return;
      }
      pushed.current = Math.max(0, pushed.current - 1);
      const wanted = new URLSearchParams(window.location.search).get("step") as Step | null;
      const target = wanted && steps.includes(wanted) && isReachable(current, wanted) ? wanted : "services";
      if (target === current.step) return;
      fromPop.current = true;
      dispatch({ type: "goto", step: target });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [steps, homeHref]);

  const goBack = useCallback(() => {
    if (state.step === "services") return;
    // Keep browser history and the flow in step: pop our own entry when there is one.
    if (pushed.current > 0) window.history.back();
    else dispatch({ type: "back", steps });
  }, [state.step, steps]);

  /* ---- step transition + focus (M-11, B-23) ---- */
  const { main, heading } = useStepTransition(state.step, ALL_STEPS);

  /* ---- booking ---- */
  const idempotency = useRef<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const booking = useMutation({
    mutationFn: (details: CustomerDetails) => {
      idempotency.current ??= newIdempotencyKey();
      return createBookingRequest(
        business.id,
        { serviceIds: state.serviceIds, staffId: state.staffId, startsAt: state.slot!.start, customer: details },
        idempotency.current,
      );
    },
    onSuccess: (confirmation) => {
      idempotency.current = null;
      dispatch({ type: "confirmed", confirmation });
      queryClient.invalidateQueries({ queryKey: ["availability", business.id] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        idempotency.current = null;
        dispatch({ type: "slotTaken", time: state.slot ? clockTime(new Date(state.slot.start), business.timezone) : "that time" });
        queryClient.invalidateQueries({ queryKey: ["availability", business.id] });
      }
    },
  });
  const apiError = booking.error instanceof ApiError ? booking.error : null;
  const inlineError = apiError && apiError.status !== 409 && apiError.status !== 422 ? apiError.message : null;

  /* ---- derived ---- */
  const selection = summarizeSelection(catalog, state.serviceIds);
  const eligible = staffForServices(catalog, state.serviceIds);
  const staffName = (id: string) => catalog.staff.find((s) => s.id === id)?.displayName;
  const summary: SummaryData = {
    items: selection.services.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents })),
    durationMin: selection.durationMin,
    priceCents: selection.priceCents,
    staffLabel: state.staffId === "any" ? "Any professional" : (staffName(state.staffId) ?? "Any professional"),
    whenLabel: state.slot
      ? `${shortDate(new Date(state.slot.start), business.timezone)}, ${clockTime(new Date(state.slot.start), business.timezone)}`
      : null,
    currency: business.currency,
    locale: business.locale,
  };
  const action =
    state.step === "details"
      ? { label: "Confirm booking", disabled: false, busy: booking.isPending, formId: DETAILS_FORM_ID }
      : { label: "Continue", disabled: !canAdvance(state), busy: false, onClick: () => dispatch({ type: "next", steps }) };

  const onDetailsChange = useCallback((details: Details) => dispatch({ type: "saveDetails", details }), []);
  const stepIndex = (progress as readonly Step[]).indexOf(state.step);
  const noteLabel = business.category === "beauty" ? "Note for the artist" : "Note for the barber";

  return (
    <div className="bk">
      <header className="bk-header">
        {stepIndex > 0 && (
          <button type="button" className="bk-back" aria-label="Back" onClick={goBack}>
            <ArrowLeft size={20} aria-hidden />
          </button>
        )}
        <a href={homeHref} className="bk-brand">
          <ShopMark logo={business.logo} mark={business.mark} name={business.short} size={32} />
          <span className="bk-brand-name display">{business.short}</span>
        </a>
        {state.step !== "done" && (
          <span className="bk-stepcount">
            Step {stepIndex + 1} of {progress.length}
          </span>
        )}
      </header>

      <div className="bk-body">
        <main ref={main} className="bk-main" id="main">
          {state.step !== "done" && (
            <ol className="bk-progress" aria-label="Progress">
              {progress.map((s, i) => (
                <li key={s} data-done={i <= stepIndex} aria-current={s === state.step ? "step" : undefined}>
                  <span className="sr-only">{TITLES[s]}</span>
                </li>
              ))}
            </ol>
          )}
          <h2 ref={heading} tabIndex={-1} className="bk-title">
            {TITLES[state.step]}
          </h2>

          {state.step === "services" && (
            <ServiceStep
              catalog={catalog}
              selected={state.serviceIds}
              currency={business.currency}
              locale={business.locale}
              onToggle={(id) => {
                const next = state.serviceIds.includes(id) ? state.serviceIds.filter((x) => x !== id) : [...state.serviceIds, id];
                const keepStaff = state.staffId !== "any" && staffForServices(catalog, next).some((p) => p.id === state.staffId);
                dispatch({ type: "toggleService", id, keepStaff });
              }}
            />
          )}
          {state.step === "staff" && (
            <StaffStep staff={eligible} selected={state.staffId} onSelect={(id) => dispatch({ type: "selectStaff", id })} onBack={goBack} />
          )}
          {state.step === "time" && (
            <TimeStep
              businessId={business.id}
              timezone={business.timezone}
              maxAdvanceDays={business.maxAdvanceDays}
              serviceIds={state.serviceIds}
              staffId={state.staffId}
              date={state.date}
              slot={state.slot}
              takenSlots={state.takenSlots}
              notice={state.notice}
              now={now}
              onSelectDate={(date) => dispatch({ type: "selectDate", date })}
              onSelectSlot={(date, slot) => {
                dispatch({ type: "selectDate", date });
                dispatch({ type: "selectSlot", slot });
              }}
            />
          )}
          {state.step === "details" && (
            <DetailsStep
              defaults={state.details}
              shopName={business.short}
              noteLabel={noteLabel}
              error={inlineError}
              fieldErrors={apiError?.status === 422 ? apiError.fieldErrors : {}}
              onChange={onDetailsChange}
              onSubmit={(values) => {
                setCustomerEmail(values.email);
                booking.mutate(values);
              }}
            />
          )}
          {state.step === "done" && state.confirmation && (
            <Confirmation
              shopName={business.short}
              timezone={business.timezone}
              currency={business.currency}
              locale={business.locale}
              startsAt={state.confirmation.startsAt}
              staffName={staffName(state.confirmation.staffId) ?? "Your professional"}
              services={selection.services.map((s) => s.name)}
              durationMin={selection.durationMin}
              priceCents={selection.priceCents}
              address={address}
              manageUrl={state.confirmation.manageUrl}
              email={customerEmail || state.details.email}
              onBookAnother={() => {
                pushed.current = 0;
                booking.reset();
                dispatch({ type: "reset" });
              }}
            />
          )}
        </main>

        {state.step !== "done" && <SummaryAside data={summary} action={action} />}
      </div>

      {state.step !== "done" && <SummaryBar data={summary} action={action} />}
    </div>
  );
}
