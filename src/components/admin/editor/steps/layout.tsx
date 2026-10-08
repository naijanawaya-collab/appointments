"use client";

import Image from "next/image";
import { Home, MousePointerClick } from "lucide-react";
import { HERO_LAYOUTS, SECTION_LABELS, type StorefrontConfig } from "@/domain/storefront/config";
import { addUnique, heroQuality } from "../editor-state";
import { useEditor } from "../editor-context";
import { SortableList } from "../sortable-list";

/* ---------------- 5. Hero ---------------- */

const HERO_INFO: Record<StorefrontConfig["hero"]["layout"], { label: string; hint: string }> = {
  full: { label: "Full-bleed", hint: "One big photo behind your name" },
  split: { label: "Split", hint: "Photo beside your name and tagline" },
  carousel: { label: "Carousel", hint: "Up to 5 photos that fade; needs 3+" },
  text: { label: "Text + pattern", hint: "No photo, your name on a subtle pattern" },
};

export function HeroStep() {
  const { config, update, mediaById, openPicker, editPhoto } = useEditor();
  const photos = config.hero.mediaIds.map((id) => mediaById.get(id)).filter((m) => m !== undefined);
  const layout = config.hero.layout;
  const usesOne = layout === "split" || layout === "full";

  return (
    <div className="ed-stack">
      <fieldset className="ed-fieldset">
        <legend className="field-label">Layout</legend>
        <div className="ed-hero-layouts" role="radiogroup" aria-label="Hero layout">
          {HERO_LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={layout === l}
              className="ed-option"
              onClick={() => update((c) => ({ ...c, hero: { ...c.hero, layout: l } }))}
            >
              <strong>{HERO_INFO[l].label}</strong>
              <span>{HERO_INFO[l].hint}</span>
            </button>
          ))}
        </div>
        {layout === "carousel" && photos.length < 3 && (
          <p className="ed-hint is-warn" role="note">
            ◐ Add {3 - photos.length} more photo{3 - photos.length === 1 ? "" : "s"} for the carousel. Until then visitors see the split layout.
          </p>
        )}
      </fieldset>

      {layout !== "text" && (
        <div>
          <span className="field-label">Photos</span>
          {photos.length === 0 ? (
            <p className="ad-empty">No hero photo yet. Visitors see your name on a pattern until you add one.</p>
          ) : (
            <SortableList
              items={photos}
              label="Hero photos"
              itemLabel={(m) => m.alt || "photo"}
              onReorder={(items) => update((c) => ({ ...c, hero: { ...c.hero, mediaIds: items.map((m) => m.id) } }))}
              renderItem={(m, handle) => {
                const q = heroQuality(m.width);
                const index = config.hero.mediaIds.indexOf(m.id);
                return (
                  <div className="ed-photo-row">
                    {photos.length > 1 && handle}
                    <span className="ed-thumb">
                      <Image src={m.src} alt="" fill sizes="64px" style={{ objectFit: "cover", objectPosition: m.position }} />
                    </span>
                    <span className="ed-photo-row-text">
                      <span className="ed-photo-row-title">{m.alt || <em className="ed-warn-text">No description yet</em>}</span>
                      <span className={`ed-hint ${q.ok ? "is-ok" : "is-warn"}`}>
                        {q.ok ? "✓ " : "◐ "}
                        {q.ok ? `${m.width} × ${m.height} · sharp enough` : q.message}
                      </span>
                      {usesOne && index > 0 && <span className="ed-muted">Not shown with the {HERO_INFO[layout].label.toLowerCase()} layout</span>}
                    </span>
                    <span className="ed-row-actions">
                      <button type="button" className="btn btn-link" onClick={() => editPhoto(m.id, { forHero: true })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-link"
                        aria-label={`Remove ${m.alt || "photo"} from the hero`}
                        onClick={() => update((c) => ({ ...c, hero: { ...c.hero, mediaIds: c.hero.mediaIds.filter((x) => x !== m.id) } }))}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                );
              }}
            />
          )}
          {photos.length < 5 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                openPicker({
                  title: usesOne && photos.length === 0 ? "Choose the hero photo" : "Add hero photos",
                  max: 5 - photos.length,
                  exclude: config.hero.mediaIds,
                  onPick: (ids) => update((c) => ({ ...c, hero: { ...c.hero, mediaIds: addUnique(c.hero.mediaIds, ids, 5) } })),
                })
              }
            >
              {photos.length ? "Add photos" : "Add a photo"}
            </button>
          )}
          <p className="field-hint">Text on the photo always gets a dark scrim, so any photo stays readable.</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- 6. Sections ---------------- */

export function SectionsStep() {
  const { config, update, showInPreview } = useEditor();
  const items = config.sections.map((s) => ({ id: s.key, ...s }));

  return (
    <div className="ed-stack">
      <p className="ed-lead">Drag to reorder. Hidden sections keep their content.</p>
      <div className="ed-fixed-row">
        <Home size={18} aria-hidden />
        <strong>Hero</strong>
        <span className="ed-muted">Always first</span>
      </div>
      <SortableList
        items={items}
        label="Sections"
        itemLabel={(s) => SECTION_LABELS[s.key]}
        onReorder={(list) => update((c) => ({ ...c, sections: list.map(({ key, visible }) => ({ key, visible })) }))}
        renderItem={(s, handle) => (
          <div className={`ed-section-row ${s.visible ? "" : "is-hidden"}`}>
            {handle}
            <span className="ed-section-name">
              {SECTION_LABELS[s.key]}
              {!s.visible && <span className="ed-muted"> · hidden</span>}
            </span>
            <label className="ad-switch">
              <input
                type="checkbox"
                role="switch"
                checked={s.visible}
                aria-label={`Show ${SECTION_LABELS[s.key]}`}
                onChange={(e) => {
                  const visible = e.target.checked;
                  update((c) => ({ ...c, sections: c.sections.map((x) => (x.key === s.key ? { ...x, visible } : x)) }));
                  if (visible) showInPreview(`sec-${s.key}`);
                }}
              />
            </label>
          </div>
        )}
      />
      <div className="ed-fixed-row">
        <MousePointerClick size={18} aria-hidden />
        <strong>“Book now” button</strong>
        <span className="ed-muted">Always on</span>
      </div>
      <p className="field-hint">Keyboard: focus a handle, Space to lift, ↑↓ to move, Space to drop.</p>
    </div>
  );
}
