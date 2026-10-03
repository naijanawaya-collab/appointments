import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const action = vi.fn();
vi.mock("./actions", () => ({ cancelBookingAction: (...args: unknown[]) => action(...args) }));

const { CancelForm } = await import("./cancel-form");

beforeEach(() => action.mockReset());

describe("CancelForm", () => {
  it("asks for confirmation before cancelling", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({ status: "cancelled" });
    render(<CancelForm token="tok" />);

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));
    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    expect(await screen.findByRole("status")).toHaveTextContent("This booking has been cancelled");
    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get("token")).toBe("tok");
  });

  it("shows the server's reason when cancelling isn't possible", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({ status: "error", message: "Online cancellation closes 24 hours before." });
    render(<CancelForm token="tok" />);
    await user.click(screen.getByRole("button", { name: "Cancel booking" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Online cancellation closes 24 hours before.");
  });
});
