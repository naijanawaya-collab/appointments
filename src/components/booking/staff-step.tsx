"use client";

import type { CatalogStaff } from "@/domain/catalog/selection";

type Props = {
  staff: CatalogStaff[];
  selected: string | "any";
  onSelect: (id: string | "any") => void;
};

/** Step 2: a specific professional, or "any" (earliest free). */
export function StaffStep({ staff, selected, onSelect }: Props) {
  if (staff.length === 0) {
    return (
      <p className="text-muted">
        No single professional offers all selected services. Go back and choose fewer services.
      </p>
    );
  }

  const options = [
    { id: "any" as const, displayName: "Any professional", title: "Most availability", photoUrl: null },
    ...staff,
  ];

  return (
    <div role="radiogroup" aria-label="Professional" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((p) => {
        const isOn = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => onSelect(p.id)}
            className={`rounded-xl border bg-surface p-4 text-left transition focus-visible:outline-2 focus-visible:outline-accent ${
              isOn ? "border-accent ring-1 ring-accent" : "border-line hover:border-muted"
            }`}
          >
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote staff photos; switch to next/image once a storage domain is configured
              <img src={p.photoUrl} alt="" className="mb-3 size-12 rounded-full object-cover" loading="lazy" />
            ) : (
              <span
                aria-hidden
                className="mb-3 flex size-12 items-center justify-center rounded-full bg-background text-base font-semibold"
              >
                {p.id === "any" ? "★" : p.displayName.slice(0, 1)}
              </span>
            )}
            <span className="block font-medium">{p.displayName}</span>
            {p.title && <span className="block text-sm text-muted">{p.title}</span>}
          </button>
        );
      })}
    </div>
  );
}
