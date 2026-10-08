import { describe, expect, it } from "vitest";
import {
  canAdvance,
  EMPTY_DETAILS,
  initialState,
  initialWizardState,
  persistable,
  progressSteps,
  stepsFor,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./wizard-state";
import { groupSlotsByPart, upcomingDates } from "./dates";

const STEPS = stepsFor(2);
const run = (actions: WizardAction[], from: WizardState = initialWizardState) => actions.reduce(wizardReducer, from);
const slot = { start: "2026-10-06T07:00:00.000Z", staffIds: ["a"] };
const next = { type: "next", steps: STEPS } as const;
const back = { type: "back", steps: STEPS } as const;

describe("steps", () => {
  it("skips the professional step for one-person shops (B-8)", () => {
    expect(stepsFor(1)).toEqual(["services", "time", "details", "done"]);
    expect(progressSteps(stepsFor(1))).toHaveLength(3);
    expect(progressSteps(stepsFor(3))).toHaveLength(4);
  });

  it("moves through the one-person flow without a staff step", () => {
    const s = run([{ type: "toggleService", id: "s1" }, { type: "next", steps: stepsFor(1) }]);
    expect(s.step).toBe("time");
  });
});

describe("wizardReducer", () => {
  it("can't leave services without a service (B-2)", () => {
    expect(canAdvance(initialWizardState)).toBe(false);
    expect(run([next]).step).toBe("services");
    expect(run([{ type: "toggleService", id: "s1" }, next]).step).toBe("staff");
  });

  it("toggles services and resets dependent choices", () => {
    const s = run([
      { type: "toggleService", id: "s1" },
      { type: "selectStaff", id: "a" },
      { type: "selectSlot", slot },
      { type: "toggleService", id: "s2" },
    ]);
    expect(s).toMatchObject({ serviceIds: ["s1", "s2"], staffId: "any", slot: null });
    expect(run([{ type: "toggleService", id: "s1" }], s).serviceIds).toEqual(["s2"]);
  });

  it("keeps a preselected professional who still offers every service (B-9)", () => {
    const s = run([{ type: "selectStaff", id: "a" }, { type: "toggleService", id: "s1", keepStaff: true }]);
    expect(s.staffId).toBe("a");
  });

  it("needs a slot before details; next never jumps to done", () => {
    let s = run([{ type: "toggleService", id: "s1" }, next, next]);
    expect(s.step).toBe("time");
    expect(run([next], s).step).toBe("time");
    s = run([{ type: "selectDate", date: "2026-10-06" }, { type: "selectSlot", slot }, next], s);
    expect(s.step).toBe("details");
    expect(run([next], s).step).toBe("details");
  });

  it("changing the date clears the slot, re-selecting the same date doesn't (B-13)", () => {
    const s = run([{ type: "selectDate", date: "2026-10-06" }, { type: "selectSlot", slot }]);
    expect(run([{ type: "selectDate", date: "2026-10-06" }], s).slot).toEqual(slot);
    expect(run([{ type: "selectDate", date: "2026-10-07" }], s).slot).toBeNull();
  });

  it("keeps details when going back and forth (B-19)", () => {
    const details = { ...EMPTY_DETAILS, name: "Maria" };
    const s = run([{ type: "saveDetails", details }, back]);
    expect(s.details.name).toBe("Maria");
  });

  it("returns to time with an alert and strikes the taken slot (B-14)", () => {
    const s = run([{ type: "selectSlot", slot }, { type: "slotTaken", time: "09:00" }], { ...initialWizardState, step: "details" });
    expect(s).toMatchObject({ step: "time", slot: null, takenSlots: [slot.start] });
    expect(s.notice?.title).toBe("That time was just taken.");
    expect(s.notice?.text).toContain("Someone booked 09:00 a moment ago");
    expect(run([{ type: "selectSlot", slot }], s).slot).toBeNull(); // taken slots can't be picked again
  });

  it("guards ?step= jumps to steps the user can't be on", () => {
    expect(run([{ type: "goto", step: "details" }]).step).toBe("services");
    expect(run([{ type: "goto", step: "done" }]).step).toBe("services");
  });

  it("confirms, can't go back from done, and resets", () => {
    const confirmation = { bookingId: "b", staffId: "a", startsAt: slot.start, manageUrl: "/b/x" };
    const s = run([{ type: "confirmed", confirmation }]);
    expect(s.step).toBe("done");
    expect(run([back], s).step).toBe("done");
    expect(run([{ type: "reset" }], s)).toEqual(initialWizardState);
  });
});

describe("initialState", () => {
  const valid = { validServiceIds: new Set(["s1", "s2"]), validStaffIds: new Set(["a", "b"]) };

  it("preselects ?service= and ?staff= (B-3, B-9)", () => {
    const s = initialState({ saved: null, service: "s2", staff: "b", ...valid });
    expect(s).toMatchObject({ serviceIds: ["s2"], staffId: "b", step: "services" });
  });

  it("restores a saved session, dropping unknown ids and unreachable steps", () => {
    const saved = persistable({ ...initialWizardState, serviceIds: ["s1", "gone"], step: "details", slot: null });
    const s = initialState({ saved, service: null, staff: null, ...valid });
    expect(s.serviceIds).toEqual(["s1"]);
    expect(s.step).toBe("services"); // details needs a slot
  });

  it("ignores unknown preselects", () => {
    expect(initialState({ saved: null, service: "nope", staff: "nope", ...valid })).toMatchObject({ serviceIds: [], staffId: "any" });
  });
});

describe("upcomingDates", () => {
  it("starts today in the business timezone and spans the horizon", () => {
    const days = upcomingDates({ now: new Date("2026-10-05T23:30:00Z"), timezone: "Europe/Vienna", count: 3, locale: "en-GB" });
    expect(days.map((d) => d.date)).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
    expect(days[0]).toMatchObject({ dayOfMonth: "6", weekday: "Tue", isToday: true });
  });
});

describe("groupSlotsByPart", () => {
  it("groups by local time of day", () => {
    const groups = groupSlotsByPart(
      [
        { start: "2026-10-06T07:00:00.000Z", staffIds: ["a"] },
        { start: "2026-10-06T11:30:00.000Z", staffIds: ["a"] },
        { start: "2026-10-06T16:00:00.000Z", staffIds: ["a"] },
      ],
      "Europe/Vienna",
    );
    expect(groups.map((g) => [g.part, g.slots.length])).toEqual([
      ["Morning", 1],
      ["Afternoon", 1],
      ["Evening", 1],
    ]);
  });
});
