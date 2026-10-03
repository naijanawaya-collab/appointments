import { describe, expect, it } from "vitest";
import { canAdvance, initialWizardState, wizardReducer, type WizardAction, type WizardState } from "./wizard-state";
import { groupSlotsByPart, upcomingDates } from "./dates";

const run = (actions: WizardAction[], from: WizardState = initialWizardState) => actions.reduce(wizardReducer, from);
const slot = { start: "2026-10-06T07:00:00.000Z", staffIds: ["a"] };

describe("wizardReducer", () => {
  it("can't leave the services step without a service", () => {
    expect(canAdvance(initialWizardState)).toBe(false);
    expect(run([{ type: "next" }]).step).toBe("services");
    expect(run([{ type: "toggleService", id: "s1" }, { type: "next" }]).step).toBe("staff");
  });

  it("toggles services and resets dependent choices", () => {
    const s = run([
      { type: "toggleService", id: "s1" },
      { type: "selectStaff", id: "a" },
      { type: "selectSlot", slot },
      { type: "toggleService", id: "s2" },
    ]);
    expect(s.serviceIds).toEqual(["s1", "s2"]);
    expect(s.staffId).toBe("any");
    expect(s.slot).toBeNull();
    expect(run([{ type: "toggleService", id: "s1" }], s).serviceIds).toEqual(["s2"]);
  });

  it("requires a slot before details, and never jumps to done via next", () => {
    let s = run([{ type: "toggleService", id: "s1" }, { type: "next" }, { type: "next" }]);
    expect(s.step).toBe("time");
    expect(run([{ type: "next" }], s).step).toBe("time");
    s = run([{ type: "selectDate", date: "2026-10-06" }, { type: "selectSlot", slot }, { type: "next" }], s);
    expect(s.step).toBe("details");
    expect(run([{ type: "next" }], s).step).toBe("details");
  });

  it("changing date clears the slot", () => {
    const s = run([{ type: "selectSlot", slot }, { type: "selectDate", date: "2026-10-07" }]);
    expect(s.slot).toBeNull();
  });

  it("goes back one step and stays put at the ends", () => {
    expect(run([{ type: "back" }]).step).toBe("services");
    const s = run([{ type: "toggleService", id: "s1" }, { type: "next" }, { type: "back" }]);
    expect(s.step).toBe("services");
  });

  it("returns to the time step with a notice when the slot was taken", () => {
    const s = run([{ type: "selectSlot", slot }, { type: "slotTaken", message: "Just taken" }], {
      ...initialWizardState,
      step: "details",
    });
    expect(s).toMatchObject({ step: "time", slot: null, notice: "Just taken" });
  });

  it("confirms and resets", () => {
    const confirmation = { bookingId: "b", staffId: "a", startsAt: slot.start, manageUrl: "/manage/x" };
    const s = run([{ type: "confirmed", confirmation }]);
    expect(s.step).toBe("done");
    expect(run([{ type: "back" }], s).step).toBe("done");
    expect(run([{ type: "reset" }], s)).toEqual(initialWizardState);
  });
});

describe("upcomingDates", () => {
  it("starts at today in the business timezone and spans the horizon", () => {
    // 23:30 UTC Oct 5 = Oct 6 in Vienna
    const days = upcomingDates({ now: new Date("2026-10-05T23:30:00Z"), timezone: "Europe/Vienna", count: 3, locale: "en-GB" });
    expect(days.map((d) => d.date)).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
    expect(days[0]).toMatchObject({ dayOfMonth: "6", weekday: "Tue", isToday: true });
    expect(days[1].isToday).toBe(false);
  });

  it("crosses month boundaries", () => {
    const days = upcomingDates({ now: new Date("2026-10-30T10:00:00Z"), timezone: "Europe/Vienna", count: 3, locale: "en-GB" });
    expect(days.map((d) => d.date)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
});

describe("groupSlotsByPart", () => {
  it("groups by local time of day in the business timezone", () => {
    const groups = groupSlotsByPart(
      [
        { start: "2026-10-06T07:00:00.000Z", staffIds: ["a"] }, // 09:00
        { start: "2026-10-06T11:30:00.000Z", staffIds: ["a"] }, // 13:30
        { start: "2026-10-06T16:00:00.000Z", staffIds: ["a"] }, // 18:00
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
