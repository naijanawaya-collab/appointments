import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SummaryAside, SummaryBar, type SummaryData } from "./summary";

const data: SummaryData = {
  items: [{ id: "s1", name: "Classic cut", durationMin: 40, priceCents: 3200 }],
  durationMin: 40,
  priceCents: 3200,
  staffLabel: "Any professional",
  whenLabel: "Tue 13 Oct, 18:00",
  currency: "EUR",
  locale: "de-AT",
};

/**
 * Regression: "Continue" on the time step must never submit the details form
 * when the next step renders. (It did when one <button> element was re-used
 * for both, and the customer's details were already filled in.)
 */
function Flow({ Summary, onSubmit }: { Summary: typeof SummaryBar; onSubmit: () => void }) {
  const [step, setStep] = useState<"time" | "details">("time");
  const action =
    step === "details"
      ? { label: "Confirm booking", disabled: false, busy: false, formId: "details" }
      : { label: "Continue", disabled: false, busy: false, onClick: () => setStep("details") };
  return (
    <>
      {step === "details" && (
        <form
          id="details"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input aria-label="Name" defaultValue="Second Customer" />
        </form>
      )}
      <Summary data={data} action={action} />
    </>
  );
}

describe.each([
  ["mobile bar", SummaryBar],
  ["desktop aside", SummaryAside],
])("primary action (%s)", (_name, Summary) => {
  it("Continue moves to the details step without submitting it", async () => {
    const onSubmit = vi.fn();
    render(<Flow Summary={Summary} onSubmit={onSubmit} />);
    const user = userEvent.setup();
    const cont = screen.getByRole("button", { name: "Continue" });
    await user.click(cont);
    expect(screen.getByLabelText("Name")).toHaveValue("Second Customer");
    expect(onSubmit).not.toHaveBeenCalled();
    const confirm = screen.getByRole("button", { name: "Confirm booking" });
    expect(confirm).not.toBe(cont);
    await user.click(confirm);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
