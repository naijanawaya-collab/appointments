import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalog } from "@/domain/catalog/selection";
import { BookingFlow } from "./booking-flow";
import type { FlowBusiness } from "./types";

const business: FlowBusiness = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Kaiser & Co. Gentlemen’s Barbers",
  short: "Kaiser & Co.",
  mark: "K",
  logo: null,
  category: "barber",
  timezone: "Europe/Vienna",
  currency: "EUR",
  locale: "de-AT",
  maxAdvanceDays: 14,
};

const CUT = "22222222-2222-4222-8222-222222222222";
const BEARD = "33333333-3333-4333-8333-333333333333";
const ANNA = "44444444-4444-4444-8444-444444444444";
const BEN = "55555555-5555-4555-8555-555555555555";

const catalog: Catalog = {
  categories: [
    { id: "c1", name: "Haircuts" },
    { id: "c2", name: "Beard & shave" },
  ],
  services: [
    { id: CUT, name: "Classic cut", description: "Wash, cut", categoryId: "c1", durationMin: 40, priceCents: 3200, image: null },
    { id: BEARD, name: "Beard trim", description: null, categoryId: "c2", durationMin: 20, priceCents: 1800, image: null },
  ],
  staff: [
    { id: ANNA, displayName: "Anna Berg", title: "Owner", bio: null, photo: null, serviceIds: [CUT, BEARD] },
    { id: BEN, displayName: "Ben Novak", title: null, bio: null, photo: null, serviceIds: [CUT] },
  ],
};

const NOW = new Date("2026-10-05T06:00:00Z"); // Mon 08:00 Vienna
const S0900 = "2026-10-06T07:00:00.000Z"; // Tue 09:00
const S1430 = "2026-10-06T12:30:00.000Z";

type Reply = { status: number; body: unknown };
let routes: { days: () => Reply; availability: (url: URL) => Reply; book: (init?: RequestInit) => Reply };

const defaults = (): typeof routes => ({
  days: () => ({
    status: 200,
    body: {
      days: Array.from({ length: 15 }, (_, i) => {
        const date = new Date(Date.UTC(2026, 9, 5 + i)).toISOString().slice(0, 10);
        return { date, closed: date === "2026-10-05" || date === "2026-10-11" }; // Mon + Sun closed
      }),
    },
  }),
  availability: (url) => ({
    status: 200,
    body: {
      date: url.searchParams.get("date"),
      timezone: "Europe/Vienna",
      durationMin: 40,
      slots: [
        { start: S0900, staffIds: [ANNA, BEN] },
        { start: S1430, staffIds: [BEN] },
      ],
      nextAvailable: null,
    },
  }),
  book: () => ({ status: 201, body: { bookingId: "b1", staffId: BEN, startsAt: S0900, manageUrl: "http://localhost/kaiser/b/TOKEN" } }),
});

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  const r = url.pathname.endsWith("/days")
    ? routes.days()
    : url.pathname.endsWith("/availability")
      ? routes.availability(url)
      : url.pathname.endsWith("/bookings")
        ? routes.book(init)
        : { status: 404, body: {} };
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
});

function renderFlow(c: Catalog = catalog) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BookingFlow business={business} catalog={c} address="Josefstädter Straße 21, 1080 Wien" homeHref="/kaiser" now={NOW} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  routes = defaults();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

const cont = () => screen.getAllByRole("button", { name: "Continue" })[0];

async function toTime(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Classic cut/ }));
  await user.click(cont());
  await user.click(cont()); // Any professional
  await screen.findByRole("heading", { name: "Pick a time" });
}

async function toDetails(user: ReturnType<typeof userEvent.setup>) {
  await toTime(user);
  await user.click(await screen.findByRole("radio", { name: "09:00" }));
  await user.click(cont());
  await screen.findByRole("heading", { name: "Your details" });
}

describe("BookingFlow: services (B-1…B-3)", () => {
  it("needs a service; totals update instantly", async () => {
    const user = userEvent.setup();
    renderFlow();
    expect(cont()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("Select at least one service").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Classic cut/ }));
    await user.click(screen.getByRole("button", { name: /Beard trim/ }));
    expect(screen.getByRole("button", { name: /Classic cut/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(/€\s50,00/u).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 h · 2 services/)).toBeInTheDocument();
    expect(cont()).toHaveAttribute("aria-disabled", "false");
  });

  it("shows category chips and step counter", () => {
    renderFlow();
    expect(screen.getByRole("group", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("preselects ?service= and ?staff= from the URL (B-3, B-9)", async () => {
    window.history.replaceState(null, "", `/kaiser/book?service=${BEARD}&staff=${ANNA}`);
    const user = userEvent.setup();
    renderFlow();
    expect(screen.getByRole("button", { name: /Beard trim/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(cont());
    expect(screen.getByRole("radio", { name: /Anna Berg/ })).toHaveAttribute("aria-checked", "true");
  });
});

describe("BookingFlow: professional (B-6…B-8)", () => {
  it("defaults to Any and lists only staff offering every service; arrow keys move selection", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: /Classic cut/ }));
    await user.click(screen.getByRole("button", { name: /Beard trim/ }));
    await user.click(cont());
    const group = screen.getByRole("radiogroup", { name: "Professional" });
    expect(within(group).getByRole("radio", { name: /Any professional/ })).toHaveAttribute("aria-checked", "true");
    expect(within(group).queryByRole("radio", { name: /Ben Novak/ })).not.toBeInTheDocument();
    within(group).getByRole("radio", { name: /Any professional/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: /Anna Berg/ })).toHaveAttribute("aria-checked", "true");
  });

  it("skips the professional step when the shop has one professional (B-8)", async () => {
    const user = userEvent.setup();
    renderFlow({ ...catalog, staff: [catalog.staff[0]] });
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Classic cut/ }));
    await user.click(cont());
    expect(await screen.findByRole("heading", { name: "Pick a time" })).toBeInTheDocument();
  });
});

describe("BookingFlow: time (B-10…B-15)", () => {
  it("auto-selects the first open day, marks closed days, shows Vienna times", async () => {
    const user = userEvent.setup();
    renderFlow();
    await toTime(user);
    const strip = screen.getByRole("radiogroup", { name: "Date" });
    expect(await within(strip).findByRole("radio", { name: "Today 5 Oct, closed" })).toHaveAttribute("aria-disabled", "true");
    await waitFor(() => expect(within(strip).getByRole("radio", { name: "Tue 6 Oct" })).toHaveAttribute("aria-checked", "true"));
    expect(await screen.findByRole("radio", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "14:30" })).toBeInTheDocument();
    expect(screen.getByText("Vienna time")).toBeInTheDocument();
  });

  it("empty day offers a jump to the next free date (B-12)", async () => {
    routes.availability = (url) => ({
      status: 200,
      body: {
        date: url.searchParams.get("date"),
        timezone: "Europe/Vienna",
        durationMin: 40,
        slots: [],
        nextAvailable: { date: "2026-10-13", time: "09:30", start: "x", label: "Tue 13 Oct 09:30" },
      },
    });
    const user = userEvent.setup();
    renderFlow();
    await toTime(user);
    expect(await screen.findByText("No free times on Tue 6 Oct")).toBeInTheDocument();
    expect(screen.getByText(/The next free time is Tue 13 Oct at 09:30/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jump to Tue 13 Oct" }));
    expect(screen.getByRole("radio", { name: "Tue 13 Oct" })).toHaveAttribute("aria-checked", "true");
  });

  it("error state keeps the selection and retries (B-12)", async () => {
    let fail = true;
    const ok = routes.availability;
    routes.availability = (url) => (fail ? { status: 500, body: {} } : ok(url));
    const user = userEvent.setup();
    renderFlow();
    await toTime(user);
    expect(await screen.findByText("Couldn’t load times.")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("radio", { name: "09:00" })).toBeInTheDocument();
  });

  it("Continue needs a slot; changing the date clears it (B-13)", async () => {
    const user = userEvent.setup();
    renderFlow();
    await toTime(user);
    expect(cont()).toHaveAttribute("aria-disabled", "true");
    await user.click(await screen.findByRole("radio", { name: "09:00" }));
    expect(cont()).toHaveAttribute("aria-disabled", "false");
    await user.click(screen.getByRole("radio", { name: "Wed 7 Oct" }));
    expect(cont()).toHaveAttribute("aria-disabled", "true");
  });
});

describe("BookingFlow: details + submit (B-14…B-22)", () => {
  it("validates with the designed copy and focuses the first invalid field (B-16)", async () => {
    const user = userEvent.setup();
    renderFlow();
    await toDetails(user);
    expect(screen.getByLabelText(/Phone/)).toHaveValue("+43");
    await user.click(screen.getAllByRole("button", { name: "Confirm booking" })[0]);
    expect(await screen.findByText("! Please enter your name")).toBeInTheDocument();
    expect(screen.getByText("! Enter a full email address, e.g. name@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("books with an idempotency key, shows the assigned barber and calendar link (B-18, B-20, B-21)", async () => {
    const user = userEvent.setup();
    renderFlow();
    await toDetails(user);
    await user.type(screen.getByLabelText("Name"), "Maria Muster");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getAllByRole("button", { name: "Confirm booking" })[0]);

    expect(await screen.findByRole("heading", { name: "Booking confirmed" })).toBeInTheDocument();
    expect(screen.getByText("Ben Novak")).toBeInTheDocument();
    expect(screen.getByText("Tuesday 6 October 2026")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage or cancel" })).toHaveAttribute("href", "http://localhost/kaiser/b/TOKEN");
    expect(screen.getByRole("link", { name: /Add to calendar/ })).toHaveAttribute("href", "http://localhost/kaiser/b/TOKEN/calendar.ics");
    expect(screen.getByText(/maria@example.com/)).toBeInTheDocument();

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect((post[1]!.headers as Record<string, string>)["idempotency-key"]).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(JSON.parse(String(post[1]!.body))).toMatchObject({
      serviceIds: [CUT],
      staffId: "any",
      startsAt: S0900,
      customer: { name: "Maria Muster", email: "maria@example.com", phone: "" },
    });
    expect(sessionStorage.getItem(`bk:${business.id}`)).toBeNull(); // cleared when done
  });

  it("409 returns to time with an alert and the slot struck through, details kept (B-14)", async () => {
    routes.book = () => ({ status: 409, body: { error: { code: "SLOT_UNAVAILABLE", message: "taken" } } });
    const user = userEvent.setup();
    renderFlow();
    await toDetails(user);
    await user.type(screen.getByLabelText("Name"), "Maria");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getAllByRole("button", { name: "Confirm booking" })[0]);

    expect(await screen.findByRole("heading", { name: "Pick a time" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("That time was just taken. Someone booked 09:00 a moment ago.");
    expect(await screen.findByRole("radio", { name: "09:00, just taken" })).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("radio", { name: "14:30" }));
    await user.click(cont());
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
  });

  it("server errors stay on details with the inline message", async () => {
    routes.book = () => ({ status: 500, body: {} });
    const user = userEvent.setup();
    renderFlow();
    await toDetails(user);
    await user.type(screen.getByLabelText("Name"), "Maria");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getAllByRole("button", { name: "Confirm booking" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
  });
});

describe("BookingFlow: navigation (B-19, B-23, B-24)", () => {
  it("Back keeps choices and the URL tracks the step", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: /Classic cut/ }));
    await user.click(cont());
    expect(window.location.search).toContain("step=staff");
    expect(screen.getByRole("heading", { name: "Choose a professional" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Choose services" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Classic cut/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores progress from the session after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = renderFlow();
    await user.click(screen.getByRole("button", { name: /Classic cut/ }));
    await user.click(cont());
    unmount();
    await act(async () => renderFlow());
    expect(screen.getByRole("heading", { name: "Choose a professional" })).toBeInTheDocument();
  });
});
