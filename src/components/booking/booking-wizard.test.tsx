import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalog } from "@/domain/catalog/selection";
import { BookingWizard, type WizardBusiness } from "./booking-wizard";

const business: WizardBusiness = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Barber",
  timezone: "Europe/Vienna",
  currency: "EUR",
  locale: "en-GB",
  maxAdvanceDays: 14,
};

const HAIRCUT = "22222222-2222-4222-8222-222222222222";
const BEARD = "33333333-3333-4333-8333-333333333333";
const ANNA = "44444444-4444-4444-8444-444444444444";
const BEN = "55555555-5555-4555-8555-555555555555";

const catalog: Catalog = {
  categories: [],
  services: [
    { id: HAIRCUT, name: "Haircut", description: null, categoryId: null, image: null, durationMin: 30, priceCents: 2500 },
    { id: BEARD, name: "Beard trim", description: null, categoryId: null, image: null, durationMin: 20, priceCents: 1500 },
  ],
  staff: [
    { id: ANNA, displayName: "Anna", title: "Owner", bio: null, photo: null, serviceIds: [HAIRCUT, BEARD] },
    { id: BEN, displayName: "Ben", title: null, bio: null, photo: null, serviceIds: [HAIRCUT] },
  ],
};

const NOW = new Date("2026-10-05T06:00:00Z"); // Monday 08:00 Vienna
const SLOT_0900 = "2026-10-05T07:00:00.000Z";
const SLOT_1400 = "2026-10-05T12:00:00.000Z";

type Handler = (url: URL, init?: RequestInit) => { status: number; body: unknown };
let handler: Handler;
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  const { status, body } = handler(url, init);
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
});

const defaultHandler: Handler = (url, init) => {
  if (url.pathname.endsWith("/catalog")) return { status: 200, body: catalog };
  if (url.pathname.endsWith("/availability")) {
    return {
      status: 200,
      body: {
        date: url.searchParams.get("date"),
        timezone: "Europe/Vienna",
        durationMin: 30,
        slots: [
          { start: SLOT_0900, staffIds: [ANNA, BEN] },
          { start: SLOT_1400, staffIds: [BEN] },
        ],
      },
    };
  }
  if (url.pathname.endsWith("/bookings") && init?.method === "POST") {
    return {
      status: 201,
      body: { bookingId: "b1", staffId: BEN, startsAt: SLOT_0900, manageUrl: "http://localhost/manage/tok" },
    };
  }
  return { status: 404, body: {} };
};

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BookingWizard business={business} initialCatalog={catalog} now={NOW} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  handler = defaultHandler;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

async function goToTimeStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Haircut/ }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Continue" })); // "Any professional" preselected
  await screen.findByRole("heading", { name: "Pick a time" });
}

describe("BookingWizard", () => {
  it("needs a service before continuing and shows running totals", async () => {
    const user = userEvent.setup();
    renderWizard();

    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Haircut/ }));
    await user.click(screen.getByRole("button", { name: /Beard trim/ }));
    expect(screen.getByRole("button", { name: /Haircut/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("€40.00")).toBeInTheDocument();
    expect(screen.getByText(/50 min/)).toBeInTheDocument();
    expect(cont).toBeEnabled();
  });

  it("only offers professionals who can do every selected service", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /Haircut/ }));
    await user.click(screen.getByRole("button", { name: /Beard trim/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const group = screen.getByRole("radiogroup", { name: "Professional" });
    expect(within(group).getByRole("radio", { name: /Any professional/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /Anna/ })).toBeInTheDocument();
    expect(within(group).queryByRole("radio", { name: /Ben/ })).not.toBeInTheDocument();
  });

  it("loads times for the selected day in the shop's timezone", async () => {
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);

    expect(await screen.findByRole("radio", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "14:00" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Morning" })).toBeInTheDocument();

    const call = fetchMock.mock.calls.map(([u]) => new URL(String(u), "http://x")).find((u) => u.pathname.endsWith("/availability"))!;
    expect(call.searchParams.get("date")).toBe("2026-10-05");
    expect(call.searchParams.get("services")).toBe(HAIRCUT);
    expect(call.searchParams.get("staff")).toBe("any");

    await user.click(screen.getByRole("radio", { name: /Tue 6 Oct/ }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes("date=2026-10-06"))).toBe(true),
    );
  });

  it("shows an empty state when a day is fully booked", async () => {
    handler = (url, init) =>
      url.pathname.endsWith("/availability")
        ? { status: 200, body: { date: "x", timezone: "Europe/Vienna", durationMin: 30, slots: [] } }
        : defaultHandler(url, init);
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);
    expect(await screen.findByText(/No free times on this day/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("validates details, books, and shows the confirmation", async () => {
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);
    await user.click(await screen.findByRole("radio", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByText("Please enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);

    await user.type(screen.getByLabelText("Name"), "Maria Muster");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByRole("heading", { name: "Booking confirmed" })).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument(); // assigned professional
    expect(screen.getByRole("link", { name: "Manage or cancel" })).toHaveAttribute(
      "href",
      "http://localhost/manage/tok",
    );

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body))).toMatchObject({
      serviceIds: [HAIRCUT],
      staffId: "any",
      startsAt: SLOT_0900,
      customer: { name: "Maria Muster", email: "maria@example.com", website: "" },
    });
  });

  it("sends the customer back to pick another time when the slot was just taken", async () => {
    handler = (url, init) =>
      url.pathname.endsWith("/bookings")
        ? {
            status: 409,
            body: { error: { code: "SLOT_UNAVAILABLE", message: "Someone just booked that time. Please pick another." } },
          }
        : defaultHandler(url, init);
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);
    await user.click(await screen.findByRole("radio", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Name"), "Maria");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByRole("heading", { name: "Pick a time" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Someone just booked that time");
  });

  it("shows server errors on the details step", async () => {
    handler = (url, init) =>
      url.pathname.endsWith("/bookings")
        ? { status: 429, body: { error: { code: "RATE_LIMITED", message: "Too many booking attempts." } } }
        : defaultHandler(url, init);
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);
    await user.click(await screen.findByRole("radio", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Name"), "Maria");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many booking attempts.");
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
  });

  it("can go back without losing the selection", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /Haircut/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: /Haircut/ })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("DetailsStep accessibility", () => {
  it("links errors to fields without changing their accessible names", async () => {
    const user = userEvent.setup();
    renderWizard();
    await goToTimeStep(user);
    await user.click(await screen.findByRole("radio", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    const email = await screen.findByRole("textbox", { name: "Email" });
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/We'll send your confirmation here\. Enter a valid email address/);
    expect(screen.queryByRole("textbox", { name: "Website" })).not.toBeInTheDocument();
  });
});
