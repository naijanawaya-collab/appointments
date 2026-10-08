"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { WEEKDAY_LABELS } from "@/domain/hours/hours";
import { hoursIssues, type HoursRange } from "@/domain/hours/edit";
import type { ActionResult } from "@/lib/action";
import { FormStatus, type FormStatusState } from "./form-kit";

const FULL_DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * A week of opening/working hours: each day closed or one or more ranges
 * (a lunch break = two ranges). Shared by the shop and every professional.
 */
export function HoursEditor({
  initial,
  onSave,
  saveLabel = "Save hours",
  extra,
}: {
  initial: HoursRange[];
  onSave: (ranges: HoursRange[], extra: boolean) => Promise<ActionResult<unknown>>;
  saveLabel?: string;
  /** Optional checkbox shown next to Save (e.g. "Also apply to the team"). */
  extra?: string;
}) {
  const [ranges, setRanges] = useState<HoursRange[]>(initial);
  const [applyExtra, setApplyExtra] = useState(false);
  const [status, setStatus] = useState<FormStatusState>({ kind: "idle" });
  const [pending, setPending] = useState(false);
  const issues = hoursIssues(ranges);

  const dayRanges = (weekday: number) => ranges.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === weekday);
  const update = (i: number, patch: Partial<HoursRange>) => setRanges((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRanges((rs) => rs.filter((_, k) => k !== i));
  const add = (weekday: number) =>
    setRanges((rs) => {
      const last = rs.filter((r) => r.weekday === weekday).at(-1);
      const fallback = rs.find((r) => r.weekday !== weekday) ?? { startTime: "09:00", endTime: "18:00" };
      return [...rs, last ? { weekday, startTime: last.endTime < "22:00" ? last.endTime : "09:00", endTime: last.endTime < "22:00" ? "23:00" : "18:00" } : { weekday, startTime: fallback.startTime, endTime: fallback.endTime }];
    });
  const copyMondayToWeekdays = () =>
    setRanges((rs) => {
      const monday = rs.filter((r) => r.weekday === 1);
      return [...rs.filter((r) => r.weekday === 1 || r.weekday > 5), ...[2, 3, 4, 5].flatMap((weekday) => monday.map((m) => ({ ...m, weekday })))];
    });

  return (
    <form
      className="ad-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (Object.keys(issues).length) return setStatus({ kind: "error", message: "Fix the highlighted times first." });
        setPending(true);
        const r = await onSave(ranges, applyExtra);
        setPending(false);
        setStatus(r.ok ? { kind: "ok", message: r.message ?? "Saved." } : { kind: "error", message: r.error });
      }}
    >
      <div className="ad-hours">
        {WEEKDAY_LABELS.map((label, d) => {
          const weekday = d + 1;
          const rows = dayRanges(weekday);
          return (
            <div key={weekday} className="ad-hours-day" role="group" aria-label={FULL_DAY[d]}>
              <span className="ad-hours-name">{label}</span>
              <div className="ad-hours-ranges">
                {rows.length === 0 && (
                  <span className="ad-hours-closed">
                    Closed
                    <button type="button" className="btn btn-link" onClick={() => add(weekday)}>
                      Add hours
                    </button>
                  </span>
                )}
                {rows.map((r, n) => {
                  const issue = issues[`${weekday}.${n}`];
                  return (
                    <div key={r.i}>
                      <div className="ad-hours-range">
                        <input
                          type="time"
                          className="field-input is-compact"
                          aria-label={`${FULL_DAY[d]} opens`}
                          value={r.startTime}
                          step={300}
                          aria-invalid={issue ? true : undefined}
                          onChange={(e) => update(r.i, { startTime: e.target.value })}
                        />
                        <span aria-hidden="true">–</span>
                        <input
                          type="time"
                          className="field-input is-compact"
                          aria-label={`${FULL_DAY[d]} closes`}
                          value={r.endTime}
                          step={300}
                          aria-invalid={issue ? true : undefined}
                          onChange={(e) => update(r.i, { endTime: e.target.value })}
                        />
                        <button type="button" className="btn btn-secondary btn-icon" aria-label={`Remove ${FULL_DAY[d]} ${r.startTime}–${r.endTime}`} onClick={() => remove(r.i)}>
                          <X size={16} aria-hidden="true" />
                        </button>
                        {n === rows.length - 1 && (
                          <button type="button" className="btn btn-link" onClick={() => add(weekday)} aria-label={`Add a break on ${FULL_DAY[d]}`}>
                            <Plus size={14} aria-hidden="true" />
                            Split
                          </button>
                        )}
                      </div>
                      {issue && <p className="field-error">! {issue}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ad-form-foot">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {saveLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={copyMondayToWeekdays}>
          Copy Monday to Tue–Fri
        </button>
        {extra && (
          <label className="ad-switch">
            <input type="checkbox" checked={applyExtra} onChange={(e) => setApplyExtra(e.target.checked)} />
            {extra}
          </label>
        )}
        <FormStatus status={status} />
      </div>
    </form>
  );
}
