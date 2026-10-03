"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Slot } from "@/domain/availability/compute-slots";
import { availabilityKey, fetchAvailability } from "./api";
import { formatSlotTime, groupSlotsByPart, upcomingDates } from "./dates";

type Props = {
  businessId: string;
  timezone: string;
  locale: string;
  maxAdvanceDays: number;
  serviceIds: string[];
  staffId: string;
  date: string | null;
  slot: Slot | null;
  notice: string | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: Slot) => void;
  /** Injected in tests for deterministic dates. */
  now?: Date;
};

/** Step 3: pick a day, then a time. Times are shown in the shop's timezone. */
export function TimeStep(props: Props) {
  const { businessId, timezone, locale, serviceIds, staffId, date, slot, onSelectDate, onSelectSlot } = props;

  const days = useMemo(
    () =>
      upcomingDates({
        now: props.now ?? new Date(),
        timezone,
        count: Math.min(props.maxAdvanceDays + 1, 60),
        locale,
      }),
    [props.now, timezone, props.maxAdvanceDays, locale],
  );
  const activeDate = date ?? days[0]?.date ?? null;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: availabilityKey(businessId, activeDate, serviceIds, staffId),
    queryFn: () => fetchAvailability({ businessId, date: activeDate!, serviceIds, staffId }),
    enabled: activeDate !== null,
    staleTime: 30_000,
  });

  const groups = data ? groupSlotsByPart(data.slots, timezone) : [];

  return (
    <div className="space-y-6">
      {props.notice && (
        <p role="alert" className="rounded-lg border border-line bg-surface p-3 text-sm text-danger">
          {props.notice}
        </p>
      )}

      <div
        role="radiogroup"
        aria-label="Date"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]"
      >
        {days.map((d) => {
          const isOn = d.date === activeDate;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={isOn}
              aria-label={`${d.weekday} ${d.dayOfMonth} ${d.month}`}
              onClick={() => onSelectDate(d.date)}
              className={`flex min-w-16 snap-start flex-col items-center rounded-xl border px-3 py-2 transition ${
                isOn ? "border-accent bg-accent text-accent-foreground" : "border-line bg-surface hover:border-muted"
              }`}
            >
              <span className="text-xs">{d.isToday ? "Today" : d.weekday}</span>
              <span className="text-lg font-semibold leading-tight">{d.dayOfMonth}</span>
              <span className="text-xs opacity-70">{d.month}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" aria-busy={isPending}>
        {isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Loading times">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-line" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-sm">
            <p className="text-danger">Couldn&apos;t load times.</p>
            <button type="button" onClick={() => refetch()} className="mt-2 underline">
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted">No free times on this day. Please pick another date.</p>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.part} aria-label={g.part}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">{g.part}</h3>
                <div role="radiogroup" aria-label={`${g.part} times`} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {g.slots.map((s) => {
                    const isOn = slot?.start === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        role="radio"
                        aria-checked={isOn}
                        onClick={() => onSelectSlot(s)}
                        className={`h-11 rounded-lg border text-sm font-medium tabular-nums transition ${
                          isOn ? "border-accent bg-accent text-accent-foreground" : "border-line bg-surface hover:border-muted"
                        }`}
                      >
                        {formatSlotTime(s.start, timezone, locale)}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
