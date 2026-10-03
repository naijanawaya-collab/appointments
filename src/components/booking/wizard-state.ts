/**
 * Booking wizard state machine (pure – no React), so every transition is
 * unit-tested and the UI just renders `state.step`.
 *
 *   services ─► staff ─► time ─► details ─► done
 *       ▲          ▲        ▲        │
 *       └──────────┴────────┴── back / slot taken
 */
import type { Slot } from "@/domain/availability/compute-slots";

export type Step = "services" | "staff" | "time" | "details" | "done";
export const STEPS: Step[] = ["services", "staff", "time", "details", "done"];

export type Confirmation = {
  bookingId: string;
  staffId: string;
  startsAt: string;
  manageUrl: string;
};

export type WizardState = {
  step: Step;
  serviceIds: string[];
  staffId: string | "any";
  date: string | null;
  slot: Slot | null;
  confirmation: Confirmation | null;
  /** One-off message, e.g. "that time was just taken" */
  notice: string | null;
};

export type WizardAction =
  | { type: "toggleService"; id: string }
  | { type: "selectStaff"; id: string | "any" }
  | { type: "selectDate"; date: string }
  | { type: "selectSlot"; slot: Slot }
  | { type: "next" }
  | { type: "back" }
  | { type: "confirmed"; confirmation: Confirmation }
  | { type: "slotTaken"; message: string }
  | { type: "reset" };

export const initialWizardState: WizardState = {
  step: "services",
  serviceIds: [],
  staffId: "any",
  date: null,
  slot: null,
  confirmation: null,
  notice: null,
};

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

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "toggleService": {
      const has = state.serviceIds.includes(action.id);
      const serviceIds = has ? state.serviceIds.filter((id) => id !== action.id) : [...state.serviceIds, action.id];
      // A different selection may change who can do it and how long it takes.
      return { ...state, serviceIds, staffId: "any", slot: null, notice: null };
    }
    case "selectStaff":
      return { ...state, staffId: action.id, slot: null, notice: null };
    case "selectDate":
      return { ...state, date: action.date, slot: null, notice: null };
    case "selectSlot":
      return { ...state, slot: action.slot, notice: null };
    case "next": {
      if (!canAdvance(state)) return state;
      const i = STEPS.indexOf(state.step);
      return { ...state, step: STEPS[Math.min(i + 1, STEPS.indexOf("details"))], notice: null };
    }
    case "back": {
      if (state.step === "services" || state.step === "done") return state;
      return { ...state, step: STEPS[STEPS.indexOf(state.step) - 1], notice: null };
    }
    case "confirmed":
      return { ...state, step: "done", confirmation: action.confirmation, notice: null };
    case "slotTaken":
      return { ...state, step: "time", slot: null, notice: action.message };
    case "reset":
      return initialWizardState;
  }
}
