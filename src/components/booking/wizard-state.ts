/**
 * Booking flow state machine (BEHAVIOUR.md §2). Pure – no React – so every
 * transition is unit-tested and the UI only renders `state.step`.
 *
 *   services ──(≥1)──► staff* ──► time ──(slot)──► details ──(valid)──► done
 *       ▲                │          ▲                 │
 *       └──── back ──────┘          └──── 409 taken ──┘
 *   * skipped when the shop has exactly one professional (B-8)
 */
import type { Slot } from "@/domain/availability/compute-slots";

export type Step = "services" | "staff" | "time" | "details" | "done";
export const ALL_STEPS: readonly Step[] = ["services", "staff", "time", "details", "done"];

export type Confirmation = { bookingId: string; staffId: string; startsAt: string; manageUrl: string };

export type Details = { name: string; email: string; phone: string; note: string };
export const EMPTY_DETAILS: Details = { name: "", email: "", phone: "+43", note: "" };

export type WizardState = {
  step: Step;
  serviceIds: string[];
  staffId: string | "any";
  date: string | null;
  slot: Slot | null;
  /** Kept while moving back and forth (B-19) and after a 409 (B-14). */
  details: Details;
  /** Slots that turned out to be taken (rendered struck, not selectable). */
  takenSlots: string[];
  confirmation: Confirmation | null;
  /** One-off alert, e.g. "That time was just taken." */
  notice: { title: string; text: string } | null;
};

export type WizardAction =
  /** `keepStaff`: the chosen professional still offers every selected service (B-9). */
  | { type: "toggleService"; id: string; keepStaff?: boolean }
  | { type: "selectStaff"; id: string | "any" }
  | { type: "selectDate"; date: string }
  | { type: "selectSlot"; slot: Slot }
  | { type: "saveDetails"; details: Details }
  | { type: "goto"; step: Step }
  | { type: "next"; steps: readonly Step[] }
  | { type: "back"; steps: readonly Step[] }
  | { type: "confirmed"; confirmation: Confirmation }
  | { type: "slotTaken"; time: string }
  | { type: "reset" };

export const initialWizardState: WizardState = {
  step: "services",
  serviceIds: [],
  staffId: "any",
  date: null,
  slot: null,
  details: EMPTY_DETAILS,
  takenSlots: [],
  confirmation: null,
  notice: null,
};

/** The steps this shop's flow uses (B-8: no professional step with one professional). */
export function stepsFor(staffCount: number): Step[] {
  return staffCount === 1 ? ["services", "time", "details", "done"] : ["services", "staff", "time", "details", "done"];
}

/** Steps shown in the progress bar ("Step N of M"). */
export const progressSteps = (steps: readonly Step[]) => steps.filter((s) => s !== "done");

export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case "services":
      return state.serviceIds.length > 0;
    case "staff":
      return true;
    case "time":
      return state.slot !== null;
    default:
      return false;
  }
}

/** Can the user be on `step` given what they've chosen? (guards ?step= in the URL) */
export function isReachable(state: WizardState, step: Step): boolean {
  if (step === "services") return true;
  if (step === "done") return state.confirmation !== null;
  if (state.serviceIds.length === 0) return false;
  if (step === "details") return state.slot !== null;
  return true;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "toggleService": {
      const has = state.serviceIds.includes(action.id);
      const serviceIds = has ? state.serviceIds.filter((id) => id !== action.id) : [...state.serviceIds, action.id];
      // A different selection can change who can do it and how long it takes.
      return { ...state, serviceIds, staffId: action.keepStaff ? state.staffId : "any", slot: null, takenSlots: [], notice: null };
    }
    case "selectStaff":
      return { ...state, staffId: action.id, slot: null, takenSlots: [], notice: null };
    case "selectDate":
      return state.date === action.date ? state : { ...state, date: action.date, slot: null }; // B-13
    case "selectSlot":
      if (state.takenSlots.includes(action.slot.start)) return state;
      return { ...state, slot: action.slot, notice: null };
    case "saveDetails":
      return { ...state, details: action.details };
    case "goto":
      return isReachable(state, action.step) ? { ...state, step: action.step } : state;
    case "next": {
      if (!canAdvance(state)) return state;
      const i = action.steps.indexOf(state.step);
      const next = action.steps[i + 1];
      return next && next !== "done" ? { ...state, step: next, notice: null } : state;
    }
    case "back": {
      const i = action.steps.indexOf(state.step);
      if (i <= 0 || state.step === "done") return state;
      return { ...state, step: action.steps[i - 1], notice: null };
    }
    case "confirmed":
      return { ...state, step: "done", confirmation: action.confirmation, notice: null };
    case "slotTaken": {
      const taken = state.slot ? [...new Set([...state.takenSlots, state.slot.start])] : state.takenSlots;
      return {
        ...state,
        step: "time",
        slot: null,
        takenSlots: taken,
        notice: {
          title: "That time was just taken.",
          text: `Someone booked ${action.time} a moment ago. Your services and details are saved, pick another time.`,
        },
      };
    }
    case "reset":
      return initialWizardState;
  }
}

/**
 * Initial state from the URL (?service=, ?staff=, B-3/B-9) merged with a
 * saved session (reload keeps progress). Unknown ids are ignored.
 */
export function initialState(opts: {
  saved: Partial<WizardState> | null;
  service: string | null;
  staff: string | null;
  validServiceIds: Set<string>;
  validStaffIds: Set<string>;
}): WizardState {
  const saved = opts.saved ?? {};
  let state: WizardState = {
    ...initialWizardState,
    serviceIds: (saved.serviceIds ?? []).filter((id) => opts.validServiceIds.has(id)),
    staffId: saved.staffId && (saved.staffId === "any" || opts.validStaffIds.has(saved.staffId)) ? saved.staffId : "any",
    date: saved.date ?? null,
    slot: saved.slot ?? null,
    details: { ...EMPTY_DETAILS, ...saved.details },
    step: saved.step && saved.step !== "done" ? saved.step : "services",
  };
  if (opts.service && opts.validServiceIds.has(opts.service) && !state.serviceIds.includes(opts.service)) {
    state = { ...state, serviceIds: [...state.serviceIds, opts.service], step: "services" };
  }
  if (opts.staff && opts.validStaffIds.has(opts.staff)) state = { ...state, staffId: opts.staff };
  if (!isReachable(state, state.step)) state = { ...state, step: "services" };
  return state;
}

/** What survives a reload (sessionStorage `bk:<shopId>`). */
export function persistable(state: WizardState): Partial<WizardState> {
  const { step, serviceIds, staffId, date, slot, details } = state;
  return { step, serviceIds, staffId, date, slot, details };
}
