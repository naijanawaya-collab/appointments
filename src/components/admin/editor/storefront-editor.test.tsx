import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { defaultConfig, type StorefrontConfig } from "@/domain/storefront/config";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/admin/kaiser/storefront" }));

const saveDraftAction = vi.fn();
const publishStorefrontAction = vi.fn();
const discardDraftAction = vi.fn();
const updateMediaAction = vi.fn();
const deleteMediaAction = vi.fn();
vi.mock("@/app/admin/_actions/storefront", () => ({
  saveDraftAction: (...a: unknown[]) => saveDraftAction(...a),
  publishStorefrontAction: (...a: unknown[]) => publishStorefrontAction(...a),
  discardDraftAction: (...a: unknown[]) => discardDraftAction(...a),
  updateMediaAction: (...a: unknown[]) => updateMediaAction(...a),
  deleteMediaAction: (...a: unknown[]) => deleteMediaAction(...a),
}));
vi.mock("@/app/admin/_actions/media", () => ({ signUploadAction: vi.fn(), saveUploadAction: vi.fn() }));

import { StorefrontEditor } from "./storefront-editor";
import type { EditorMedia, EditorShop } from "./types";

const BUSINESS_ID = "8f14e45f-ceea-4e7a-9b6c-2d3a1f0e5b71";
const PHOTO = "11111111-1111-4111-8111-111111111111";

const shop: EditorShop = {
  id: BUSINESS_ID,
  slug: "kaiser",
  name: "Kaiser & Co. Gentlemen’s Barbers",
  shortName: "Kaiser & Co.",
  mark: "K",
  tagline: "Traditional cuts",
  publicUrl: "https://kaiser-barbers.at",
  adminBase: "/admin/kaiser",
  seoDefaults: { title: "Kaiser & Co. – Book online", description: "Traditional cuts" },
};

const photo: EditorMedia = {
  id: PHOTO,
  src: "https://res.cloudinary.com/demo/image/upload/tenants/x/p1",
  width: 2400,
  height: 1600,
  alt: "",
  position: "50% 50%",
  focalX: 50,
  focalY: 50,
  bytes: 200_000,
  format: "jpg",
};

function setup(draft: StorefrontConfig = defaultConfig("classic"), published = draft, library: EditorMedia[] = [photo]) {
  const user = userEvent.setup();
  const utils = render(<StorefrontEditor shop={shop} initialDraft={draft} initialPublished={published} initialSavedAt={null} initialLibrary={library} />);
  return { user, ...utils };
}

const step = (name: string) => within(screen.getByRole("navigation", { name: "Editor steps" })).getByRole("button", { name: new RegExp(`^(\\d|✓)?\\s*${name}`) });

beforeEach(async () => {
  // Let saves flushed by the previous test's unmount settle before resetting mocks.
  await new Promise((r) => setTimeout(r, 0));
  vi.clearAllMocks();
  saveDraftAction.mockResolvedValue({ ok: true, data: { savedAt: new Date().toISOString() } });
  publishStorefrontAction.mockResolvedValue({ ok: true, data: { publishedAt: new Date().toISOString() }, message: "Published. Your storefront is live." });
});

describe("StorefrontEditor", () => {
  it("starts on the preset step with nothing to publish, and has no a11y violations", async () => {
    const { container } = setup();
    expect(screen.getByRole("heading", { level: 2, name: /Preset/ })).toBeInTheDocument();
    expect(screen.getByText("Published · no changes")).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByTitle("Preview of Kaiser & Co.")).toHaveAttribute("src", "/api/preview?shop=kaiser");
    // The preview iframe is checked by the storefront e2e axe runs.
    expect((await axe(container, { iframes: false })).violations).toEqual([]);
  });

  it("switching preset autosaves the draft once, debounced", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /Modern/ }));
    expect(screen.getByRole("radio", { name: /Modern/ })).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(saveDraftAction).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const [id, saved] = saveDraftAction.mock.calls[0];
    expect(id).toBe(BUSINESS_ID);
    expect(saved).toMatchObject({ preset: "modern", mode: "dark", accent: "#ff5a1f", hero: { layout: "full" } });
    await waitFor(() => expect(within(screen.getByRole("banner")).getByRole("button", { name: "Publish" })).toBeEnabled());
  });

  it("warns about a hard-to-read accent and fixes it in one click (ED-2)", async () => {
    const { user } = setup();
    await user.click(step("Colours"));
    const hex = screen.getByLabelText("Accent colour");
    await user.clear(hex);
    await user.type(hex, "#C9A45C");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Hard to read as text");
    expect(alert).toHaveTextContent(/: 1/);
    const fix = within(alert).getByRole("button", { name: /Fix it: use #/ });
    const suggested = fix.textContent!.match(/#[0-9A-F]{6}/)![0];
    await user.click(fix);
    expect(screen.getByLabelText("Accent colour")).toHaveValue(suggested);
    expect(screen.queryByText("Hard to read as text")).not.toBeInTheDocument();
  });

  it("'Keep mine' dismisses the warning for that colour", async () => {
    const { user } = setup();
    await user.click(step("Colours"));
    const hex = screen.getByLabelText("Accent colour");
    await user.clear(hex);
    await user.type(hex, "#F5E663");
    const alert = await screen.findByRole("alert");
    await user.click(within(alert).getByRole("button", { name: "Keep mine" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides a section and keeps the order when reordering by keyboard", async () => {
    const { user } = setup();
    await user.click(step("Sections"));
    const reviews = screen.getByRole("switch", { name: "Show Reviews" });
    expect(reviews).toBeChecked();
    await user.click(reviews);
    expect(reviews).not.toBeChecked();
    expect(screen.getByText("Reviews").parentElement).toHaveTextContent("Reviews · hidden");
    await waitFor(() => expect(saveDraftAction).toHaveBeenCalled(), { timeout: 3000 });
    const saved = saveDraftAction.mock.calls.at(-1)![1] as StorefrontConfig;
    expect(saved.sections.find((s) => s.key === "reviews")).toEqual({ key: "reviews", visible: false });
    expect(screen.getByRole("button", { name: "Move About" })).toBeInTheDocument();
  });

  it("blocks publishing until every used photo has a description", async () => {
    const draft = { ...defaultConfig("classic"), gallery: [PHOTO] };
    const { user } = setup(draft, defaultConfig("classic"));
    await user.click(step("Publish"));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("1 photo needs a description (alt text).");
    expect(screen.getByRole("button", { name: "Publish changes" })).toBeDisabled();
  });

  it("publishes the saved draft and reports success", async () => {
    const draft = { ...defaultConfig("classic"), accent: "#7a2e2e" };
    const { user } = setup(draft, defaultConfig("classic"));
    await user.click(step("Publish"));
    await user.click(screen.getByRole("button", { name: "Publish changes" }));
    expect(await screen.findByText("Published. Your storefront is live.")).toBeInTheDocument();
    expect(publishStorefrontAction).toHaveBeenCalledWith(BUSINESS_ID);
    expect(screen.getByRole("button", { name: "Everything is published" })).toBeDisabled();
  });

  it("shows why publishing failed", async () => {
    publishStorefrontAction.mockResolvedValue({ ok: false, error: "The carousel hero needs at least 3 photos." });
    const draft = { ...defaultConfig("classic"), accent: "#7a2e2e" };
    const { user } = setup(draft, defaultConfig("classic"));
    await user.click(step("Publish"));
    await user.click(screen.getByRole("button", { name: "Publish changes" }));
    expect(await screen.findByText("! The carousel hero needs at least 3 photos.")).toBeInTheDocument();
  });

  it("shows a save failure with a retry", async () => {
    saveDraftAction.mockResolvedValueOnce({ ok: false, error: "Some photos don't belong to this shop." });
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /Minimal/ }));
    expect(await screen.findByText(/Not saved/, {}, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(saveDraftAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Not saved/)).not.toBeInTheDocument());
  });

  it("edits a photo's description and focal point", async () => {
    updateMediaAction.mockImplementation(async (_b: string, _id: string, input: Record<string, unknown>) => ({ ok: true, data: { ...photo, ...input } }));
    const draft = { ...defaultConfig("classic"), gallery: [PHOTO] };
    const { user } = setup(draft);
    await user.click(step("Content"));
    await user.click(screen.getByRole("button", { name: "Edit photo without description" }));
    const dialog = await screen.findByRole("dialog", { name: "Photo" });
    await user.type(within(dialog).getByLabelText("Describe the photo (alt text)"), "Three leather chairs");
    const focal = within(dialog).getByRole("button", { name: /Focal point 50% from left/ });
    focal.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowUp}");
    expect(within(dialog).getByRole("button", { name: /Focal point 54% from left, 48% from top/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save photo" }));
    await waitFor(() => expect(updateMediaAction).toHaveBeenCalledWith(BUSINESS_ID, PHOTO, { alt: "Three leather chairs", focalX: 54, focalY: 48 }));
    expect(screen.getByRole("button", { name: "Edit Three leather chairs" })).toBeInTheDocument();
  });

  it("resets the look to the preset after confirming", async () => {
    const draft = { ...defaultConfig("classic"), accent: "#7a2e2e", mode: "dark" as const };
    const { user } = setup(draft);
    await user.click(screen.getByRole("button", { name: "Reset to preset" }));
    const dialog = screen.getByRole("dialog", { name: "Reset to preset?" });
    await user.click(within(dialog).getByRole("button", { name: "Reset look" }));
    await user.click(step("Colours"));
    expect(screen.getByLabelText("Accent colour")).toHaveValue("#8A6A2F");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  });

  it("sends theme changes to the preview frame immediately (ED-1)", async () => {
    const { user } = setup();
    const frame = screen.getByTitle("Preview of Kaiser & Co.") as HTMLIFrameElement;
    const post = vi.fn();
    Object.defineProperty(frame, "contentWindow", { value: { postMessage: post }, configurable: true });
    await user.click(step("Colours"));
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    await act(async () => {});
    const theme = post.mock.calls.map(([m]) => m).find((m) => m.type === "theme" && m.css.includes("color-scheme:dark"));
    expect(theme).toBeDefined();
    expect(post.mock.calls.at(-1)![1]).toBe(window.location.origin);
  });
});
