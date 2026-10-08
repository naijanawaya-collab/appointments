"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { localDateString, type Slot } from "@/domain/availability/compute-slots";
import { clockTime } from "@/lib/format";
import { availabilityKey, fetchAvailability, fetchDays } from "./api";
import { dayLabel, groupSlotsByPart, monthLabel, upcomingDates } from "./dates";

type Props = {
  businessId: string;
  timezone: string;
  maxAdvanceDays: number;
  serviceIds: string[];
  staffId: string;
  date: string | null;
  slot: Slot | null;
  takenSlots: string[];
  notice: { title: string; text: string } | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (date: string, slot: Slot) => void;
  /** Injected in tests for deterministic dates. */
  now?: Date;
};

/** True once `active` has stayed true for `ms` (B-11: no skeleton flash for fast responses). */
function useDelayed(active: boolean, ms: number): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setShown(true), ms);
    return () => {
      clearTimeout(t);
      setShown(false);
    };
  }, [active, ms]);
  return active && shown;
}

/** Step 3 (B-10…B-15). All times are the shop's local time, whatever the device's zone. */
export function TimeStep(p: Props) {
  const count = Math.min(p.maxAdvanceDays + 1, 61);
  const strip = useMemo(
    () => upcomingDates({ now: p.now ?? new Date(), timezone: p.timezone, count, locale: "en-GB" }),
    [p.now, p.timezone, count],
  );

  const days = useQuery({
    queryKey: ["days", p.businessId, count],
    queryFn: () => fetchDays(p.businessId, count),
    staleTime: 5 * 60_000,
  });
  const closed = useMemo(() => new Set(days.data?.days.filter((d) => d.closed).map((d) => d.date)), [days.data]);
  // B-10: first open day is auto-selected (derived, so a reload never fights the user's choice)
  const activeDate = p.date ?? (days.data ? (strip.find((d) => !closed.has(d.date))?.date ?? null) : null);

  const slots = useQuery({
    queryKey: availabilityKey(p.businessId, activeDate, p.serviceIds, p.staffId),
    queryFn: () => fetchAvailability({ businessId: p.businessId, date: activeDate!, serviceIds: p.serviceIds, staffId: p.staffId }),
    enabled: activeDate !== null,
    staleTime: 30_000,
  });
  const loading = slots.isPending && activeDate !== null;
  const showSkeleton = useDelayed(loading || days.isPending, 150);
  // Keep just-taken slots visible (struck through) even though the server no longer offers them (B-14).
  const shownSlots = useMemo(() => {
    if (!slots.data) return [];
    const offered = new Set(slots.data.slots.map((s) => s.start));
    const taken = p.takenSlots
      .filter((start) => !offered.has(start) && localDateString(new Date(start), p.timezone) === activeDate)
      .map((start) => ({ start, staffIds: [] }));
    return [...slots.data.slots, ...taken].sort((a, b) => a.start.localeCompare(b.start));
  }, [slots.data, p.takenSlots, p.timezone, activeDate]);
  const groups = groupSlotsByPart(shownSlots, p.timezone);
  const time = (iso: string) => clockTime(new Date(iso), p.timezone);

  return (
    <div className="flex flex-col gap-5">
      {p.notice && (
        <div className="bk-alert" role="alert">
          <span className="bk-alert-badge" aria-hidden>
            !
          </span>
          <span>
            <strong>{p.notice.title}</strong> {p.notice.text}
          </span>
        </div>
      )}

      <div className="bk-month">
        <strong>{monthLabel(activeDate ?? strip[0].date)}</strong>
        <span className="bk-meta">Vienna time</span>
      </div>

      <div role="radiogroup" aria-label="Date" className="bk-days">
        {strip.map((d) => {
          const isClosed = closed.has(d.date);
          const on = d.date === activeDate;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={isClosed}
              aria-label={`${d.isToday ? "Today" : d.weekday} ${d.dayOfMonth} ${d.month}${isClosed ? ", closed" : ""}`}
              className="bk-day"
              onClick={() => !isClosed && p.onSelectDate(d.date)}
            >
              <span className="bk-day-wd">{d.isToday ? "Today" : d.weekday}</span>
              <span className="bk-day-num">{d.dayOfMonth}</span>
              <span className="bk-day-mon">{isClosed ? "Closed" : d.month}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading || days.isPending ? (
          showSkeleton ? (
            <div aria-label="Loading times">
              <div className="skel bk-skel-label" />
              <div className="bk-slots">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="skel bk-skel-slot" style={{ "--i": i } as React.CSSProperties} />
                ))}
              </div>
            </div>
          ) : null
        ) : slots.isError ? (
          <div className="bk-state" data-kind="error">
            <strong className="text-danger">Couldn’t load times.</strong>
            <span className="bk-meta">Check your connection and try again. Your selection is kept.</span>
            <button type="button" className="btn btn-inverse" onClick={() => slots.refetch()}>
              Try again
            </button>
          </div>
        ) : activeDate && groups.length === 0 ? (
          <div className="bk-state">
            <span className="bk-state-icon" aria-hidden>
              <Clock size={22} />
            </span>
            <strong>No free times on {dayLabel(activeDate)}</strong>
            <span className="bk-meta">
              Please pick another date.
              {slots.data?.nextAvailable &&
                ` The next free time is ${dayLabel(slots.data.nextAvailable.date)} at ${slots.data.nextAvailable.time}.`}
            </span>
            {slots.data?.nextAvailable && (
              <button type="button" className="btn btn-secondary" onClick={() => p.onSelectDate(slots.data!.nextAvailable!.date)}>
                Jump to {dayLabel(slots.data.nextAvailable.date)}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <section key={g.part} aria-labelledby={`part-${g.part}`}>
                <h3 id={`part-${g.part}`} className="bk-cat-label bk-part">
                  {g.part}
                </h3>
                <div role="radiogroup" aria-labelledby={`part-${g.part}`} className="bk-slots">
                  {g.slots.map((s) => {
                    const taken = p.takenSlots.includes(s.start);
                    const on = p.slot?.start === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={taken}
                        aria-label={taken ? `${time(s.start)}, just taken` : time(s.start)}
                        data-taken={taken}
                        className="bk-slot"
                        onClick={() => !taken && activeDate && p.onSelectSlot(activeDate, s)}
                      >
                        {on ? `✓ ${time(s.start)}` : time(s.start)}
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
