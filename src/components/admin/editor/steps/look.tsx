"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useId, useState } from "react";
import { applyPreset, MODES } from "@/domain/storefront/config";
import { contrast, isHex, luminance } from "@/domain/theme/color";
import { accentReport } from "@/domain/theme/derive";
import { DISPLAY_FONT_KEYS, DISPLAY_FONTS } from "@/domain/theme/fonts";
import { PRESET_KEYS, PRESETS } from "@/domain/theme/presets";
import { ACCENT_SUGGESTIONS } from "@/domain/theme/suggestions";
import { useEditor } from "../editor-context";

const ratio = (n: number) => `${n.toFixed(1)} : 1`;

/* ---------------- 1. Preset ---------------- */

export function PresetStep() {
  const { config, update } = useEditor();
  return (
    <div className="ed-stack">
      <p className="ed-lead">Start from a look. You can change colours, font and layout next.</p>
      <div className="ed-presets" role="radiogroup" aria-label="Preset">
        {PRESET_KEYS.map((key) => {
          const p = PRESETS[key];
          const on = config.preset === key;
          const n = p.neutrals[p.defaultMode];
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              className="ed-preset"
              onClick={() => !on && update((c) => applyPreset(c, key))}
            >
              <span
                className="ed-preset-sample"
                style={{ background: n.background, color: n.foreground, borderRadius: p.radiusLg }}
                aria-hidden
              >
                <span style={{ fontFamily: DISPLAY_FONTS[p.font].family, fontWeight: Number(DISPLAY_FONTS[p.font].weight), textTransform: DISPLAY_FONTS[p.font].transform }}>
                  Fresh cuts
                </span>
                <span className="ed-preset-btn" style={{ background: p.defaultAccent, borderRadius: p.btnRadius }} />
              </span>
              <span className="ed-preset-name">
                {p.label}
                {on && <Check size={16} aria-hidden />}
              </span>
              <span className="ed-preset-desc">{p.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 2. Colours ---------------- */

const MODE_LABEL = { light: "Light", dark: "Dark", auto: "Auto" } as const;

export function ColoursStep() {
  const { config, update } = useEditor();
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const accentId = useId();
  const report = accentReport(config);
  const bg = PRESETS[config.preset].neutrals.light.background;
  const textRatio = contrast(config.accent, bg);
  const btnRatio = contrast(report.light.accentForeground, report.light.accent);
  const warn = report.needsFix && kept !== config.accent;
  const setAccent = (accent: string) => update((c) => ({ ...c, accent: accent.toLowerCase() }));

  return (
    <div className="ed-stack">
      <fieldset className="ed-fieldset">
        <legend className="field-label">Mode</legend>
        <div className="ed-segmented" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={config.mode === m} onClick={() => update((c) => ({ ...c, mode: m }))}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="field-hint">Auto follows each visitor’s phone setting. We generate both palettes.</p>
      </fieldset>

      <div>
        <label className="field-label" htmlFor={accentId}>
          Accent colour
        </label>
        <div className="ed-color-row">
          <input type="color" className="ed-color" value={config.accent} onChange={(e) => setAccent(e.target.value)} aria-label="Pick accent colour" />
          <input
            id={accentId}
            className="field-input ed-hex"
            value={(hexDraft ?? config.accent).toUpperCase()}
            spellCheck={false}
            maxLength={7}
            aria-invalid={hexDraft !== null && !isHex(hexDraft) ? true : undefined}
            onChange={(e) => {
              const v = `#${e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`;
              setHexDraft(v);
              if (isHex(v) && v.length === 7) setAccent(v);
            }}
            onBlur={() => setHexDraft(null)}
          />
        </div>
        <p className="field-hint">{PRESETS[config.preset].label} suggestions</p>
        <div className="ed-swatches" role="group" aria-label="Suggested colours">
          {ACCENT_SUGGESTIONS[config.preset].map((hex) => (
            <button key={hex} type="button" className="ed-swatch" style={{ background: hex }} aria-label={`Use ${hex.toUpperCase()}`} aria-pressed={config.accent === hex} onClick={() => setAccent(hex)} />
          ))}
        </div>
      </div>

      {warn && (
        <div className="ed-warn" role="alert">
          <p>
            <strong>Hard to read as text.</strong> {config.accent.toUpperCase()} on your background is <strong>{ratio(textRatio)}</strong>. Links and outlines need 4.5 : 1.
          </p>
          <p>
            Buttons are fine: we’ll use {luminance(report.light.accentForeground) > 0.5 ? "white" : "black"} text on them ({ratio(btnRatio)}). Text in your colour is darkened automatically.
          </p>
          <div className="ed-inline">
            <button type="button" className="btn btn-primary" onClick={() => setAccent(report.suggestedAccent)}>
              Fix it: use {report.suggestedAccent.toUpperCase()}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setKept(config.accent)}>
              Keep mine
            </button>
          </div>
        </div>
      )}

      <div>
        <span className="field-label">
          Secondary colour <span className="ed-muted">(optional)</span>
        </span>
        {config.secondary ? (
          <div className="ed-color-row">
            <input type="color" className="ed-color" value={config.secondary} onChange={(e) => update((c) => ({ ...c, secondary: e.target.value.toLowerCase() }))} aria-label="Pick secondary colour" />
            <span className="tabular">{config.secondary.toUpperCase()}</span>
            <button type="button" className="btn btn-link" onClick={() => update((c) => ({ ...c, secondary: null }))}>
              Remove
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => update((c) => ({ ...c, secondary: PRESETS[c.preset].neutrals.light.foreground }))}>
            + Add a secondary colour
          </button>
        )}
        <p className="field-hint">Used for patterns and dividers only, so it can’t hurt readability.</p>
      </div>

      <div>
        <span className="field-label">Generated for you</span>
        <ul className="ed-generated" aria-label="Generated colours">
          {[
            ["button", report.light.accent],
            ["hover", report.light.accentHover],
            ["pressed", report.light.accentPressed],
            ["tint", report.light.accentSubtle],
            ["text", report.light.accentText],
          ].map(([label, hex]) => (
            <li key={label}>
              <span className="ed-generated-chip" style={{ background: hex }} aria-hidden />
              <span>{label}</span>
              <span className="tabular ed-muted">{hex.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- 3. Font ---------------- */

export function FontStep() {
  const { config, update } = useEditor();
  const presetFont = PRESETS[config.preset].font;
  return (
    <div className="ed-stack">
      <p className="ed-lead">Headings use this font. Body text is always Geist, so pages stay fast and easy to read.</p>
      <div className="ed-fonts" role="radiogroup" aria-label="Display font">
        {DISPLAY_FONT_KEYS.map((key) => {
          const f = DISPLAY_FONTS[key];
          const on = (config.displayFont ?? presetFont) === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              className="ed-font"
              onClick={() => update((c) => ({ ...c, displayFont: key === presetFont ? null : key }))}
            >
              <span className="ed-font-sample" style={{ fontFamily: f.family, fontWeight: Number(f.weight), textTransform: f.transform, letterSpacing: f.tracking }}>
                Fresh cuts, honest prices
              </span>
              <span className="ed-font-name">
                {f.label}
                {key === presetFont && <span className="ed-muted"> · preset default</span>}
                {on && <Check size={16} aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 4. Logo ---------------- */

export function LogoStep() {
  const { shop, config, update, mediaById, openPicker, editPhoto } = useEditor();
  const logo = config.logoMediaId ? mediaById.get(config.logoMediaId) : undefined;
  return (
    <div className="ed-stack">
      <div className="ed-logo-preview">
        {logo ? (
          <span className="ed-logo-img">
            <Image src={logo.src} alt="" width={Math.round((logo.width / logo.height) * 48)} height={48} style={{ height: 48, width: "auto" }} />
          </span>
        ) : (
          <span className="ed-monogram" aria-hidden>
            {(shop.mark || shop.shortName || shop.name).charAt(0).toUpperCase()}
          </span>
        )}
        <span>
          <strong>{logo ? "Your logo" : "Monogram"}</strong>
          <span className="ed-muted">{logo ? " · shown at 36 px high in the header" : ` · the first letter of ${shop.shortName || shop.name}, in your font and colour`}</span>
        </span>
      </div>
      <div className="ed-inline">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openPicker({ title: "Choose your logo", max: 1, onPick: ([id]) => update((c) => ({ ...c, logoMediaId: id })) })}
        >
          {logo ? "Replace logo" : "Upload a logo"}
        </button>
        {logo && (
          <>
            <button type="button" className="btn btn-link" onClick={() => editPhoto(logo.id)}>
              Edit description
            </button>
            <button type="button" className="btn btn-link" onClick={() => update((c) => ({ ...c, logoMediaId: null }))}>
              Use the monogram instead
            </button>
          </>
        )}
      </div>
      <p className="field-hint">A wide or square logo with a transparent background (PNG or WebP) works best.</p>
    </div>
  );
}
