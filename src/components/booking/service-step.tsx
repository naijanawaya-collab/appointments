"use client";

import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { groupByCategory, type Catalog } from "@/domain/catalog/selection";
import { formatDuration, formatMoney } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  catalog: Catalog;
  selected: string[];
  currency: string;
  locale: string;
  onToggle: (id: string) => void;
};

const catId = (i: number) => `bk-cat-${i}`;

/** Step 1 (B-1…B-5): multi-select services, grouped by category, with category chips. */
export function ServiceStep({ catalog, selected, currency, locale, onToggle }: Props) {
  const groups = groupByCategory(catalog);
  const [active, setActive] = useState(0);
  const labels = useRef<(HTMLHeadingElement | null)[]>([]);

  // B-4: the active chip follows scrolling.
  useEffect(() => {
    if (groups.length < 2 || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    labels.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [groups.length]);

  if (catalog.services.length === 0) return <p className="bk-meta">No services can be booked online yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {groups.length > 1 && (
        <div className="bk-chips" role="group" aria-label="Categories">
          {groups.map((g, i) => (
            <button
              key={g.category.id ?? g.category.name}
              type="button"
              className="bk-chip"
              aria-pressed={active === i}
              onClick={() => {
                setActive(i);
                labels.current[i]?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
              }}
            >
              {g.category.name}
            </button>
          ))}
        </div>
      )}

      {groups.map((g, i) => (
        <section key={g.category.id ?? g.category.name} aria-labelledby={catId(i)}>
          <h3
            id={catId(i)}
            className="bk-cat-label"
            data-index={i}
            ref={(el) => {
              labels.current[i] = el;
            }}
          >
            {g.category.name}
          </h3>
          <ul className="bk-card m-0 list-none p-0">
            {g.services.map((s) => {
              const on = selected.includes(s.id);
              return (
                <li key={s.id}>
                  <button type="button" className="bk-svc" aria-pressed={on} onClick={() => onToggle(s.id)}>
                    {s.image && (
                      <span className="bk-svc-thumb">
                        <Image src={s.image.src} alt="" fill sizes="52px" style={{ objectFit: "cover", objectPosition: s.image.position }} />
                      </span>
                    )}
                    <span className="bk-svc-body">
                      <span className="bk-svc-name">{s.name}</span>
                      <span className="bk-meta">{[formatDuration(s.durationMin), s.description].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="bk-price">{formatMoney(s.priceCents, currency, locale)}</span>
                    <span className="svc-check" aria-hidden>
                      {on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
