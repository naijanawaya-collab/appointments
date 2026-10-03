"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  staffForServices,
  summarizeSelection,
  type Catalog,
} from "@/domain/catalog/selection";
import { formatDuration, formatMoney } from "@/lib/format";

type Props = {
  businessId: string;
  currency: string;
  locale: string;
  initialCatalog: Catalog;
};

async function fetchCatalog(businessId: string): Promise<Catalog> {
  const res = await fetch(`/api/businesses/${businessId}/catalog`);
  if (!res.ok) throw new Error("Could not load services");
  return res.json();
}

/**
 * Step 1 of the booking flow (Fresha-style): choose one or more services,
 * then see who can do them. Date/time selection and confirmation come in Phase 1.
 *
 * React Query is seeded with the server-rendered catalog (no loading flash)
 * and keeps it fresh in the background.
 */
export function ServicePicker({ businessId, currency, locale, initialCatalog }: Props) {
  const { data: catalog = initialCatalog, isError } = useQuery({
    queryKey: ["catalog", businessId],
    queryFn: () => fetchCatalog(businessId),
    initialData: initialCatalog,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | "any">("any");

  const summary = useMemo(() => summarizeSelection(catalog, selected), [catalog, selected]);
  const eligibleStaff = useMemo(() => staffForServices(catalog, selected), [catalog, selected]);

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setStaffId("any");
  };

  if (catalog.services.length === 0) {
    return <p className="text-muted">No services are bookable online yet.</p>;
  }

  return (
    <div className="space-y-8">
      {isError && (
        <p className="rounded-lg border border-line p-3 text-sm text-danger">
          Couldn&apos;t refresh services. Showing the last known list.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">1. Choose services</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {catalog.services.map((s) => {
            const isOn = selected.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={isOn}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-background"
                >
                  <span>
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-sm text-muted">
                      {formatDuration(s.durationMin)}
                      {s.description ? ` · ${s.description}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatMoney(s.priceCents, currency, locale)}
                    </span>
                    <span
                      className={`flex size-6 items-center justify-center rounded-full border text-xs ${
                        isOn ? "border-accent bg-accent text-accent-foreground" : "border-line"
                      }`}
                      aria-hidden
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

      {selected.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">2. Choose a professional</h2>
          {eligibleStaff.length === 0 ? (
            <p className="text-muted">
              No single professional offers all selected services. Try fewer services.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[{ id: "any" as const, displayName: "Any professional", title: "Earliest available" }, ...eligibleStaff].map(
                (p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStaffId(p.id)}
                    aria-pressed={staffId === p.id}
                    className={`rounded-xl border p-4 text-left transition ${
                      staffId === p.id ? "border-accent ring-1 ring-accent" : "border-line"
                    } bg-surface`}
                  >
                    <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-background text-sm font-semibold">
                      {p.id === "any" ? "★" : p.displayName.slice(0, 1)}
                    </span>
                    <span className="block font-medium">{p.displayName}</span>
                    {p.title && <span className="block text-sm text-muted">{p.title}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="text-sm">
          {selected.length === 0 ? (
            <span className="text-muted">Select at least one service</span>
          ) : (
            <>
              <span className="font-medium">
                {formatMoney(summary.priceCents, currency, locale)}
              </span>
              <span className="text-muted"> · {formatDuration(summary.durationMin)}</span>
            </>
          )}
        </div>
        <button
          type="button"
          disabled
          title="Date & time selection arrives in Phase 1"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
