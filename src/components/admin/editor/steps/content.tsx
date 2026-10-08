"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useId } from "react";
import { addUnique, announcementId } from "../editor-state";
import { useEditor } from "../editor-context";
import { SortableList } from "../sortable-list";

/* ---------------- 7. Content ---------------- */

export function ContentStep() {
  const { shop, config, update, mediaById, openPicker, editPhoto, showInPreview } = useEditor();
  const ids = { tag: useId(), text: useId(), until: useId() };
  const a = config.announcement;
  const about = config.aboutMediaId ? mediaById.get(config.aboutMediaId) : undefined;
  const gallery = config.gallery.map((id) => mediaById.get(id)).filter((m) => m !== undefined);

  const setAnnouncement = (patch: Partial<NonNullable<typeof a>>) =>
    update((c) => {
      const current = c.announcement ?? { id: "a0", tag: "", text: "", until: null };
      const next = { ...current, ...patch };
      return { ...c, announcement: { ...next, id: patch.text !== undefined ? announcementId(next.text) : next.id } };
    });

  return (
    <div className="ed-stack">
      {/* Announcement */}
      <section className="ed-group" aria-labelledby="ed-ann">
        <div className="ed-group-head">
          <h3 id="ed-ann" className="ed-group-title">
            Announcement bar
          </h3>
          <label className="ad-switch">
            <input
              type="checkbox"
              role="switch"
              checked={a !== null}
              aria-label="Show an announcement"
              onChange={(e) => {
                if (e.target.checked) {
                  setAnnouncement({ tag: "New", text: "Book online in under a minute" });
                  showInPreview("top");
                } else update((c) => ({ ...c, announcement: null }));
              }}
            />
          </label>
        </div>
        {a && (
          <div className="ed-grid-2">
            <div>
              <label className="field-label" htmlFor={ids.tag}>
                Tag
              </label>
              <input id={ids.tag} className="field-input" maxLength={16} value={a.tag} onChange={(e) => setAnnouncement({ tag: e.target.value })} placeholder="New" />
            </div>
            <div>
              <label className="field-label" htmlFor={ids.until}>
                Show until <span className="ed-muted">(optional)</span>
              </label>
              <input id={ids.until} type="date" className="field-input" value={a.until ?? ""} onChange={(e) => setAnnouncement({ until: e.target.value || null })} />
            </div>
            <div className="ed-span-2">
              <label className="field-label" htmlFor={ids.text}>
                Text
              </label>
              <input
                id={ids.text}
                className="field-input"
                maxLength={140}
                value={a.text}
                onChange={(e) => setAnnouncement({ text: e.target.value })}
                aria-invalid={a.text.trim() === "" ? true : undefined}
                placeholder="Closed 24–26 Dec. Back on the 27th from 09:00."
              />
              <p className="field-hint">{a.text.length} / 140 · e.g. holiday hours or a new service. Changing the text shows it again to people who closed it.</p>
            </div>
          </div>
        )}
      </section>

      {/* About photo */}
      <section className="ed-group" aria-labelledby="ed-about">
        <h3 id="ed-about" className="ed-group-title">
          About photo
        </h3>
        <div className="ed-photo-row">
          {about ? (
            <span className="ed-thumb">
              <Image src={about.src} alt="" fill sizes="64px" style={{ objectFit: "cover", objectPosition: about.position }} />
            </span>
          ) : (
            <span className="ed-thumb is-empty" aria-hidden />
          )}
          <span className="ed-photo-row-text">
            <span className="ed-photo-row-title">{about ? about.alt || <em className="ed-warn-text">No description yet</em> : "No photo"}</span>
            <span className="ed-muted">Shown next to your about text.</span>
          </span>
          <span className="ed-row-actions">
            {about && (
              <button type="button" className="btn btn-link" onClick={() => editPhoto(about.id)}>
                Edit
              </button>
            )}
            <button
              type="button"
              className="btn btn-link"
              onClick={() => openPicker({ title: "Choose the about photo", max: 1, onPick: ([id]) => update((c) => ({ ...c, aboutMediaId: id })) })}
            >
              {about ? "Replace" : "Choose"}
            </button>
            {about && (
              <button type="button" className="btn btn-link" onClick={() => update((c) => ({ ...c, aboutMediaId: null }))}>
                Remove
              </button>
            )}
          </span>
        </div>
      </section>

      {/* Gallery */}
      <section className="ed-group" aria-labelledby="ed-gallery">
        <div className="ed-group-head">
          <h3 id="ed-gallery" className="ed-group-title">
            Gallery <span className="ed-muted">· {gallery.length} photo{gallery.length === 1 ? "" : "s"}</span>
          </h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              openPicker({
                title: "Add gallery photos",
                max: 60 - gallery.length,
                exclude: config.gallery,
                onPick: (picked) => {
                  update((c) => ({ ...c, gallery: addUnique(c.gallery, picked, 60) }));
                  showInPreview("sec-gallery");
                },
              })
            }
          >
            Add photos
          </button>
        </div>
        {gallery.length === 0 ? (
          <p className="ad-empty">No gallery photos. With 2 or fewer, visitors see a “More work coming soon” card instead.</p>
        ) : (
          <SortableList
            items={gallery}
            layout="grid"
            label="Gallery photos"
            itemLabel={(m) => m.alt || "photo"}
            onReorder={(items) => update((c) => ({ ...c, gallery: items.map((m) => m.id) }))}
            renderItem={(m, handle) => (
              <div className="ed-tile">
                <button type="button" className="ed-tile-img" onClick={() => editPhoto(m.id)} aria-label={`Edit ${m.alt || "photo without description"}`}>
                  <Image src={m.src} alt="" fill sizes="120px" style={{ objectFit: "cover", objectPosition: m.position }} />
                  {!m.alt && <span className="ed-tile-flag">Needs a description</span>}
                </button>
                <span className="ed-tile-bar">
                  {handle}
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Remove ${m.alt || "photo"} from the gallery`}
                    onClick={() => update((c) => ({ ...c, gallery: c.gallery.filter((x) => x !== m.id) }))}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </span>
              </div>
            )}
          />
        )}
      </section>

      {/* Service images */}
      <section className="ed-group">
        <div className="ed-group-head">
          <h3 className="ed-group-title">Photos next to services</h3>
          <label className="ad-switch">
            <input
              type="checkbox"
              role="switch"
              checked={config.serviceImages}
              aria-label="Show photos next to services"
              onChange={(e) => {
                const on = e.target.checked;
                update((c) => ({ ...c, serviceImages: on }));
                showInPreview("sec-services");
              }}
            />
          </label>
        </div>
        <p className="field-hint">
          Add a photo to each service under <Link href={`${shop.adminBase}/services`}>Services</Link>.
        </p>
      </section>

      <p className="ed-note">
        Your shop name, tagline, about text, address and socials live in <Link href={`${shop.adminBase}/settings`}>Settings</Link>; opening hours and holidays in{" "}
        <Link href={`${shop.adminBase}/hours`}>Opening hours</Link>. Those changes go live right away.
      </p>
    </div>
  );
}
