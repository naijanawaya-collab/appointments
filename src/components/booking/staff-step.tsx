"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import type { CatalogStaff } from "@/domain/catalog/selection";

type Option = { id: string; name: string; sub: string; photo: CatalogStaff["photo"] };

type Props = {
  staff: CatalogStaff[];
  selected: string | "any";
  onSelect: (id: string | "any") => void;
  onBack: () => void;
};

/** Step 2 (B-6, B-7, B-9): radiogroup of professionals, "Any professional" first. */
export function StaffStep({ staff, selected, onSelect, onBack }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (staff.length === 0) {
    return (
      <div className="bk-note" role="status">
        <p className="m-0">No single professional offers all of these. Book them separately or go back.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Go back
        </button>
      </div>
    );
  }

  const options: Option[] = [
    { id: "any", name: "Any professional", sub: "Earliest available time", photo: null },
    ...staff.map((p) => ({ id: p.id, name: p.displayName, sub: p.title ?? "", photo: p.photo })),
  ];
  const index = Math.max(0, options.findIndex((o) => o.id === selected));

  // Radiogroup pattern: arrow keys move selection and focus (B-6).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onSelect(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Professional" className="bk-staff-grid" onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = i === index;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className="bk-person"
            onClick={() => onSelect(o.id)}
          >
            <span className="bk-avatar" data-any={o.id === "any"} aria-hidden>
              {o.photo ? (
                <Image src={o.photo.src} alt="" fill sizes="56px" style={{ objectFit: "cover", objectPosition: o.photo.position }} />
              ) : o.id === "any" ? (
                "✦"
              ) : (
                o.name.slice(0, 1)
              )}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{o.name}</span>
              {o.sub && <span className="bk-meta">{o.sub}</span>}
            </span>
            {on && (
              <span className="bk-person-badge" aria-hidden>
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
