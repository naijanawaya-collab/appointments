"use client";

import { groupByCategory, type Catalog } from "@/domain/catalog/selection";
import { formatDuration, formatMoney } from "@/lib/format";

type Props = {
  catalog: Catalog;
  selected: string[];
  currency: string;
  locale: string;
  onToggle: (id: string) => void;
};

/** Step 1: pick one or more services (grouped by category when present). */
export function ServiceStep({ catalog, selected, currency, locale, onToggle }: Props) {
  if (catalog.services.length === 0) {
    return <p className="text-muted">No services are bookable online yet.</p>;
  }

  const groups = new Map(groupByCategory(catalog).map((g) => [g.category.name, g.services] as const));

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([category, items]) => (
        <section key={category} aria-label={category}>
          {groups.size > 1 && (
            <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">{category}</h3>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((s) => {
              const isOn = selected.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(s.id)}
                    aria-pressed={isOn}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <span>
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {formatDuration(s.durationMin)}
                        {s.description ? ` · ${s.description}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium">{formatMoney(s.priceCents, currency, locale)}</span>
                      <span
                        aria-hidden
                        className={`flex size-6 items-center justify-center rounded-full border text-xs transition-colors ${
                          isOn ? "border-accent bg-accent text-accent-foreground" : "border-line"
                        }`}
                      >
                        {isOn ? "✓" : "+"}
                      </span>
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
