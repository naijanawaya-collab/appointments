import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh: vi.fn() }), usePathname: () => "/admin/kaiser/services/abc" }));

const saveServiceAction = vi.fn();
vi.mock("@/app/admin/_actions/catalog", () => ({ saveServiceAction: (...a: unknown[]) => saveServiceAction(...a), deleteServiceAction: vi.fn() }));
vi.mock("@/app/admin/_actions/media", () => ({ signUploadAction: vi.fn(), saveUploadAction: vi.fn() }));

import { ActionButton } from "./form-kit";
import { HoursEditor } from "./hours-editor";
import { activeNav, navFor } from "./nav";
import { ServiceForm } from "./service-form";
import { SidebarNav } from "./admin-nav";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HoursEditor", () => {
  it("opens a closed day, flags an overlap, and saves the normalised week", async () => {
    const onSave = vi.fn(async () => ({ ok: true as const, data: null, message: "Opening hours saved." }));
    render(<HoursEditor initial={[{ weekday: 1, startTime: "09:00", endTime: "13:00" }]} onSave={onSave} />);
    const user = userEvent.setup();

    const tuesday = screen.getByRole("group", { name: "Tuesday" });
    await user.click(within(tuesday).getByRole("button", { name: "Add hours" }));
    expect(within(tuesday).getByLabelText("Tuesday opens")).toHaveValue("09:00");

    // Split Monday, overlapping the morning
    await user.click(screen.getByRole("button", { name: "Add a break on Monday" }));
    const opens = within(screen.getByRole("group", { name: "Monday" })).getAllByLabelText("Monday opens");
    await user.clear(opens[1]);
    await user.type(opens[1], "12:00");
    expect(screen.getByText(/Overlaps 09:00–13:00 on Mon/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save hours" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Fix the highlighted times first.");

    await user.clear(opens[1]);
    await user.type(opens[1], "14:00");
    await user.click(screen.getByRole("button", { name: "Save hours" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        expect.objectContaining({ weekday: 1, startTime: "14:00" }),
        expect.objectContaining({ weekday: 2 }),
      ]),
      false,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Opening hours saved.");
  });

  it("removes a range to close the day", async () => {
    render(<HoursEditor initial={[{ weekday: 7, startTime: "10:00", endTime: "14:00" }]} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Sunday 10:00–14:00" }));
    expect(within(screen.getByRole("group", { name: "Sunday" })).getByText("Closed")).toBeInTheDocument();
  });
});

describe("ActionButton", () => {
  it("asks inline before destructive actions and shows errors", async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: "They have bookings." }));
    render(
      <ActionButton action={action} confirm="Remove Anna?" confirmLabel="Remove">
        Remove
      </ActionButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("group", { name: "Remove Anna?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(action).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await userEvent.click(within(screen.getByRole("group")).getByRole("button", { name: "Remove" }));
    expect(action).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent("! They have bookings.");
  });
});

describe("ServiceForm", () => {
  const props = {
    businessId: "b1",
    slug: "kaiser",
    serviceId: null,
    image: null,
    categories: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuts" }],
    team: [{ id: "22222222-2222-4222-8222-222222222222", name: "Anton" }],
    defaults: { name: "", description: "", categoryId: "", durationMin: "30", bufferMin: "0", price: "", isActive: true, imageMediaId: "", staffIds: [] },
  };

  it("validates on the client with the shared schema", async () => {
    render(<ServiceForm {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Create service" }));
    expect(await screen.findByText("! Name the service")).toBeInTheDocument();
    expect(screen.getByText("! Enter a price like 25 or 25,50")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(saveServiceAction).not.toHaveBeenCalled();
  });

  it("sends raw values, shows server field errors, then navigates to the new service", async () => {
    saveServiceAction
      .mockResolvedValueOnce({ ok: false, error: "Please check the highlighted fields.", fieldErrors: { name: "Server says no" } })
      .mockResolvedValueOnce({ ok: true, data: { id: "new-id" }, message: "Service saved." });
    render(<ServiceForm {...props} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Skin fade");
    await user.type(screen.getByLabelText(/Price/), "25,50");
    await user.click(screen.getByRole("checkbox", { name: "Anton" }));
    await user.click(screen.getByRole("button", { name: "Create service" }));
    expect(await screen.findByText("! Server says no")).toBeInTheDocument();
    expect(saveServiceAction).toHaveBeenCalledWith("b1", null, expect.objectContaining({ name: "Skin fade", price: "25,50", staffIds: [props.team[0].id] }));

    await user.click(screen.getByRole("button", { name: "Create service" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/kaiser/services/new-id"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ServiceForm {...props} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("navigation", () => {
  it("staff only see the day and bookings", () => {
    expect(navFor("staff").map((n) => n.key)).toEqual(["today", "bookings"]);
    expect(navFor("owner")).toHaveLength(8);
  });

  it("marks the current section", () => {
    expect(activeNav("/admin/kaiser", "kaiser")).toBe("today");
    expect(activeNav("/admin/kaiser/bookings/new", "kaiser")).toBe("bookings");
    expect(activeNav("/admin/kaiser/more", "kaiser")).toBe("more");
    render(<SidebarNav slug="kaiser" role="owner" />);
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });
});
