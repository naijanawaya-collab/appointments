"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { publishIssues } from "@/domain/storefront/config";
import { useEditor } from "../editor-context";

/* ---------------- 8. Publish ---------------- */

export function PublishStep({
  hasChanges,
  publishing,
  result,
  onPublish,
  onDiscard,
}: {
  hasChanges: boolean;
  publishing: boolean;
  result: { ok: boolean; message: string } | null;
  onPublish: () => void;
  onDiscard: () => Promise<void>;
}) {
  const { shop, config, update, mediaById } = useEditor();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const ids = { title: useId(), desc: useId() };
  const issues = publishIssues(config, new Map([...mediaById].map(([id, m]) => [id, m.alt])));
  const hero = config.hero.mediaIds.map((id) => mediaById.get(id)).find(Boolean);
  const host = shop.publicUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="ed-stack">
      <div>
        <span className="field-label">
          Share image <span className="ed-muted">· generated</span>
        </span>
        <div className="ed-og" aria-label="Preview of the image shown when your link is shared" role="img">
          {hero && <Image src={hero.src} alt="" fill sizes="360px" style={{ objectFit: "cover", objectPosition: hero.position }} />}
          <span className="ed-og-scrim" data-photo={Boolean(hero)} />
          <span className="ed-og-text" data-photo={Boolean(hero)}>
            <span className="ed-og-name">{shop.shortName || shop.name}</span>
            {shop.tagline && <span className="ed-og-tagline">{shop.tagline}</span>}
            <span className="ed-og-btn">Book online</span>
          </span>
        </div>
        <p className="field-hint">1200 × 630 · hero + name + accent. Updates when you publish.</p>
      </div>

      <div>
        <label className="field-label" htmlFor={ids.title}>
          Page title
        </label>
        <input
          id={ids.title}
          className="field-input"
          maxLength={60}
          value={config.seo.title}
          placeholder={shop.seoDefaults.title}
          onChange={(e) => update((c) => ({ ...c, seo: { ...c.seo, title: e.target.value } }))}
          aria-describedby={`${ids.title}-hint`}
        />
        <p className="field-hint" id={`${ids.title}-hint`}>
          {(config.seo.title || shop.seoDefaults.title).length} / 60 · shown in Google and browser tabs. Leave empty for the default.
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor={ids.desc}>
          Description
        </label>
        <textarea
          id={ids.desc}
          className="field-input"
          rows={3}
          maxLength={160}
          value={config.seo.description}
          placeholder={shop.seoDefaults.description}
          onChange={(e) => update((c) => ({ ...c, seo: { ...c.seo, description: e.target.value } }))}
          aria-describedby={`${ids.desc}-hint`}
        />
        <p className="field-hint" id={`${ids.desc}-hint`}>
          {(config.seo.description || shop.seoDefaults.description).length} / 160
        </p>
      </div>

      {issues.length > 0 && (
        <div className="ed-warn" role="alert">
          <strong>Before you publish</strong>
          <ul>
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <p className={`ad-form-status ${result.ok ? "is-ok" : "is-error"}`} role={result.ok ? "status" : "alert"}>
          {result.ok ? result.message : `! ${result.message}`}
        </p>
      )}

      <div className="ed-inline">
        <button type="button" className="btn btn-primary btn-lg" onClick={onPublish} disabled={publishing || issues.length > 0 || !hasChanges}>
          {publishing ? <span className="spinner" aria-hidden /> : null}
          {hasChanges ? "Publish changes" : "Everything is published"}
        </button>
        <a className="btn btn-secondary" href={shop.publicUrl} target="_blank" rel="noreferrer">
          View {host} ↗
        </a>
      </div>

      {hasChanges &&
        (confirmDiscard ? (
          <span className="ad-confirm" role="group" aria-label="Discard draft?">
            <span>Throw away all unpublished changes?</span>
            <button
              type="button"
              className="btn btn-danger"
              autoFocus
              onClick={async () => {
                await onDiscard();
                setConfirmDiscard(false);
              }}
            >
              Discard
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-link ed-danger-link" onClick={() => setConfirmDiscard(true)}>
            Discard unpublished changes
          </button>
        ))}
    </div>
  );
}
