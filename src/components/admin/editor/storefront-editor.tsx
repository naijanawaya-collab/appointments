"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Monitor, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { discardDraftAction, publishStorefrontAction, saveDraftAction } from "@/app/admin/_actions/storefront";
import { Dialog } from "@/components/ui/dialog";
import { applyPreset, publishIssues, withoutMedia, type StorefrontConfig } from "@/domain/storefront/config";
import { renderTheme } from "@/domain/theme/render";
import { DISPLAY_FONTS } from "@/domain/theme/fonts";
import { PRESETS } from "@/domain/theme/presets";
import { EditorContext, type EditorContextValue, type PickerRequest } from "./editor-context";
import { sameConfig, savedLabel, STEPS, stepIndex, stepSummary, structureChanged, type StepKey } from "./editor-state";
import { MediaPicker } from "./media-picker";
import { PhotoDialog } from "./photo-dialog";
import { PreviewFrame, type PreviewDevice, type PreviewHandle } from "./preview-frame";
import { ContentStep } from "./steps/content";
import { HeroStep, SectionsStep } from "./steps/layout";
import { ColoursStep, FontStep, LogoStep, PresetStep } from "./steps/look";
import { PublishStep } from "./steps/publish";
import type { EditorMedia, EditorShop } from "./types";
import { useUploads } from "./use-uploads";
import "@/styles/editor.css";

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string };

const SAVE_DELAY_MS = 700;

const SUMMARY_NAMES = {
  preset: (k: StorefrontConfig["preset"]) => PRESETS[k].label,
  font: (k: StorefrontConfig["displayFont"], preset: StorefrontConfig["preset"]) => DISPLAY_FONTS[k ?? PRESETS[preset].font].label,
};

/**
 * Storefront editor (SCREENS §6, editor boards 4a–4c).
 *
 *   settings (left / bottom sheet) ──edits──▶ config (client state)
 *        │                                     │
 *        │   theme fields ──postMessage──▶ preview iframe (≤ 100 ms, ED-1)
 *        │                                     │
 *        └── autosave (debounced) ──▶ draft in DB ──refresh──▶ preview re-renders
 *
 * Publishing copies the saved draft to the live page.
 */
export function StorefrontEditor({
  shop,
  initialDraft,
  initialPublished,
  initialSavedAt,
  initialLibrary,
}: {
  shop: EditorShop;
  initialDraft: StorefrontConfig;
  initialPublished: StorefrontConfig;
  initialSavedAt: string | null;
  initialLibrary: EditorMedia[];
}) {
  const [config, setConfig] = useState(initialDraft);
  const [published, setPublished] = useState(initialPublished);
  const [savedConfig, setSavedConfig] = useState(initialDraft);
  const [library, setLibrary] = useState(initialLibrary);
  const [step, setStep] = useState<StepKey>("preset");
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [savedAt, setSavedAt] = useState<Date | null>(initialSavedAt ? new Date(initialSavedAt) : null);
  const [now, setNow] = useState(() => new Date());
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [photo, setPhoto] = useState<{ id: string; forHero?: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [publishing, startPublish] = useTransition();

  const preview = useRef<PreviewHandle>(null);
  const latest = useRef(config);
  const saved = useRef(initialDraft);
  const rendered = useRef(initialDraft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const mediaById = useMemo(() => new Map(library.map((m) => [m.id, m])), [library]);
  const dirty = !sameConfig(config, savedConfig) || save.kind === "saving";
  const hasUnpublished = !sameConfig(config, published);

  /* ---- live preview ---- */
  const sendTheme = useCallback((c: StorefrontConfig) => preview.current?.send({ type: "theme", css: renderTheme(c).css }), []);

  /* ---- saving ---- */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) await inFlight.current;
    const target = latest.current;
    if (sameConfig(target, saved.current)) return true;

    setSave({ kind: "saving" });
    const run = (async () => {
      const res = await saveDraftAction(shop.id, target);
      if (!res.ok) {
        setSave({ kind: "error", message: res.error });
        return false;
      }
      saved.current = target;
      setSavedConfig(target);
      setSavedAt(new Date(res.data.savedAt));
      setSave({ kind: "idle" });
      if (structureChanged(rendered.current, target)) {
        rendered.current = target;
        preview.current?.send({ type: "refresh" });
      }
      return true;
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, [shop.id]);

  const update = useCallback(
    (fn: (c: StorefrontConfig) => StorefrontConfig) => {
      setConfig(fn);
      setPublishResult(null);
    },
    [],
  );

  // Theme changes reach the preview immediately; everything is saved shortly after.
  useEffect(() => {
    latest.current = config;
    sendTheme(config);
    if (sameConfig(config, saved.current)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [config, flush, sendTheme]);

  // Leaving the editor (e.g. back to the dashboard): save what's pending right away.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void flush();
      }
    },
    [flush],
  );

  // Keep "saved 2 min ago" fresh; warn before leaving with unsaved edits.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Keep the current step visible in the (scrolling) step strip on phones.
  useEffect(() => {
    document.querySelector<HTMLElement>('.ed-steps [aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [step]);

  /* ---- media ---- */
  const addToLibrary = useCallback((m: EditorMedia) => setLibrary((l) => [m, ...l.filter((x) => x.id !== m.id)]), []);
  const uploads = useUploads(shop.id, addToLibrary);

  const ctx: EditorContextValue = {
    shop,
    config,
    published,
    update,
    library,
    mediaById,
    openPicker: setPicker,
    editPhoto: (id, opts) => setPhoto({ id, ...opts }),
    showInPreview: (id) => preview.current?.send({ type: "scrollTo", id }),
  };

  /* ---- publish / discard / reset ---- */
  const issues = publishIssues(config, new Map(library.map((m) => [m.id, m.alt])));

  const publish = () =>
    startPublish(async () => {
      setPublishResult(null);
      if (!(await flush())) return;
      const res = await publishStorefrontAction(shop.id);
      if (!res.ok) return setPublishResult({ ok: false, message: res.error });
      setPublished(latest.current);
      setPublishResult({ ok: true, message: res.message ?? "Published." });
    });

  async function discard() {
    if (timer.current) clearTimeout(timer.current);
    const res = await discardDraftAction(shop.id);
    if (!res.ok) return setPublishResult({ ok: false, message: res.error });
    saved.current = res.data;
    setSavedConfig(res.data);
    rendered.current = res.data;
    latest.current = res.data;
    setConfig(res.data);
    preview.current?.send({ type: "refresh" });
  }

  const i = stepIndex(step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  const statusText =
    save.kind === "saving"
      ? "Saving…"
      : save.kind === "error"
        ? "Not saved"
        : dirty
          ? "Unsaved changes"
          : hasUnpublished
            ? `Draft · ${savedLabel(savedAt, now)}`
            : "Published · no changes";

  return (
    <EditorContext.Provider value={ctx}>
      <div className="ed-root">
        <header className="ed-top">
          <Link href={shop.adminBase} className="ed-back">
            <ArrowLeft size={18} aria-hidden /> <span className="ed-label-sm">Dashboard</span>
          </Link>
          <div className="ed-top-title">
            <h1>
              {shop.shortName || shop.name} <span className="ed-muted">· Storefront</span>
            </h1>
            <p className={`ed-status ${save.kind === "error" ? "is-error" : ""}`} role="status" aria-live="polite">
              {statusText}
              {save.kind === "error" && (
                <>
                  {" "}
                  ({save.message}){" "}
                  <button type="button" className="btn btn-link" onClick={() => void flush()}>
                    Try again
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="ed-segmented ed-device" role="radiogroup" aria-label="Preview size">
            <button type="button" role="radio" aria-checked={device === "mobile"} onClick={() => setDevice("mobile")}>
              <Smartphone size={16} aria-hidden /> <span className="ed-label-sm">Mobile</span>
            </button>
            <button type="button" role="radio" aria-checked={device === "desktop"} onClick={() => setDevice("desktop")}>
              <Monitor size={16} aria-hidden /> <span className="ed-label-sm">Desktop</span>
            </button>
          </div>
          <div className="ed-top-actions">
            <button type="button" className="btn btn-secondary ed-hide-sm" onClick={() => setConfirmReset(true)}>
              Reset to preset
            </button>
            <a className="btn btn-secondary ed-hide-sm" href={shop.publicUrl} target="_blank" rel="noreferrer">
              View live ↗
            </a>
            <button
              type="button"
              className="btn btn-primary"
              disabled={publishing || !hasUnpublished}
              onClick={() => (issues.length ? setStep("publish") : publish())}
            >
              {publishing ? <span className="spinner" aria-hidden /> : null}
              Publish
            </button>
          </div>
        </header>

        <div className="ed-body">
          <section className="ed-panel" aria-label="Storefront settings">
            <nav className="ed-steps" aria-label="Editor steps">
              <ol>
                {STEPS.map((s, n) => (
                  <li key={s.key} className={n < i ? "is-done" : n === i ? "is-current" : n === i + 1 ? "is-next is-first-next" : "is-next"}>
                    <button type="button" aria-current={s.key === step ? "step" : undefined} onClick={() => setStep(s.key)}>
                      <span className="ed-step-num" aria-hidden>
                        {n < i ? "✓" : n + 1}
                      </span>
                      {s.label}
                      {n < i && stepSummary(s.key, config, SUMMARY_NAMES) && <span className="ed-muted"> · {stepSummary(s.key, config, SUMMARY_NAMES)}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="ed-step">
              <h2 className="ed-step-title" tabIndex={-1}>
                {STEPS[i].label}
                <span className="ed-muted ed-step-count">
                  {" "}
                  · Step {i + 1} of {STEPS.length}
                  {step === "preset" ? ` · ${PRESETS[config.preset].label}` : ""}
                </span>
              </h2>
              {step === "preset" && <PresetStep />}
              {step === "colours" && <ColoursStep />}
              {step === "font" && <FontStep />}
              {step === "logo" && <LogoStep />}
              {step === "hero" && <HeroStep />}
              {step === "sections" && <SectionsStep />}
              {step === "content" && <ContentStep />}
              {step === "publish" && <PublishStep hasChanges={hasUnpublished} publishing={publishing} result={publishResult} onPublish={publish} onDiscard={discard} />}
            </div>

            <footer className="ed-step-nav">
              {prev ? (
                <button type="button" className="btn btn-secondary" onClick={() => setStep(prev.key)}>
                  <ArrowLeft size={16} aria-hidden /> {prev.label}
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button type="button" className="btn btn-primary" onClick={() => setStep(next.key)}>
                  Next: {next.label} <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </footer>
          </section>

          <section className="ed-preview" aria-label="Live preview" tabIndex={0}>
            <PreviewFrame
              ref={preview}
              device={device}
              src={`/api/preview?shop=${shop.slug}`}
              title={`Preview of ${shop.shortName || shop.name}`}
              onReady={() => sendTheme(latest.current)}
            />
          </section>
        </div>
      </div>

      <MediaPicker
        open={picker !== null}
        title={picker?.title ?? ""}
        max={picker?.max ?? 1}
        exclude={picker?.exclude}
        library={library}
        uploads={uploads.items}
        onUpload={(files) => uploads.upload(files)}
        onDismissUpload={uploads.dismiss}
        onClose={() => setPicker(null)}
        onPick={(ids) => picker?.onPick(ids)}
      />

      <PhotoDialog
        businessId={shop.id}
        photo={photo ? (mediaById.get(photo.id) ?? null) : null}
        forHero={photo?.forHero}
        shopName={shop.shortName || shop.name}
        onClose={() => setPhoto(null)}
        onSaved={(m) => {
          setLibrary((l) => l.map((x) => (x.id === m.id ? m : x)));
          preview.current?.send({ type: "refresh" });
        }}
        onDeleted={(id) => {
          setLibrary((l) => l.filter((x) => x.id !== id));
          const strip = (c: StorefrontConfig) => withoutMedia(c, id);
          // The server already removed it from the saved draft and the live page.
          saved.current = strip(saved.current);
          setSavedConfig(strip);
          setPublished(strip);
          update(strip);
        }}
      />

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset to preset?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                update((c) => applyPreset(c, c.preset));
                setConfirmReset(false);
              }}
            >
              Reset look
            </button>
          </>
        }
      >
        <p>
          Colours, font, mode and hero layout go back to the {PRESETS[config.preset].label} preset. Your photos, sections and texts stay as they are.
        </p>
      </Dialog>
    </EditorContext.Provider>
  );
}
