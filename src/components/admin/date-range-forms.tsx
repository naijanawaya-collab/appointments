"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { addClosureAction } from "@/app/admin/_actions/hours";
import { addTimeOffAction } from "@/app/admin/_actions/team";
import { closureSchema, timeOffSchema, type ClosureFormInput, type TimeOffFormInput } from "@/validation/admin";
import { Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

/** Holiday / closure for the whole shop. */
export function ClosureForm({ businessId, today }: { businessId: string; today: string }) {
  const form = useForm<ClosureFormInput>({ resolver: zodResolver(closureSchema) as never, defaultValues: { startsOn: today, endsOn: today, label: "" } });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => addClosureAction(businessId, v), { resetOnSuccess: true });
  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <div className="ad-grid cols-3">
        <Field label="First day" error={errors.startsOn?.message}>
          {(p) => <input {...p} type="date" min={today} className="field-input" {...register("startsOn")} />}
        </Field>
        <Field label="Last day" error={errors.endsOn?.message}>
          {(p) => <input {...p} type="date" min={today} className="field-input" {...register("endsOn")} />}
        </Field>
        <Field label="Note (optional)" error={errors.label?.message} hint="Shown on your storefront, e.g. “Christmas break”.">
          {(p) => <input {...p} className="field-input" maxLength={80} {...register("label")} />}
        </Field>
      </div>
      <div className="ad-form-foot">
        <SubmitButton pending={pending} className="btn btn-secondary">
          Add closure
        </SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}

/** Time off for one professional (whole days, or a few hours). */
export function TimeOffForm({ businessId, staffId, today }: { businessId: string; staffId: string; today: string }) {
  const form = useForm<TimeOffFormInput>({
    resolver: zodResolver(timeOffSchema) as never,
    defaultValues: { startsOn: today, endsOn: today, startTime: "", endTime: "", reason: "" },
  });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => addTimeOffAction(businessId, staffId, v), { resetOnSuccess: true });
  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <div className="ad-grid cols-2">
        <Field label="From" error={errors.startsOn?.message}>
          {(p) => <input {...p} type="date" min={today} className="field-input" {...register("startsOn")} />}
        </Field>
        <Field label="From time (optional)" error={errors.startTime?.message} hint="Empty = whole day">
          {(p) => <input {...p} type="time" step={300} className="field-input" {...register("startTime")} />}
        </Field>
        <Field label="Until" error={errors.endsOn?.message}>
          {(p) => <input {...p} type="date" min={today} className="field-input" {...register("endsOn")} />}
        </Field>
        <Field label="Until time (optional)" error={errors.endTime?.message} hint="Empty = end of that day">
          {(p) => <input {...p} type="time" step={300} className="field-input" {...register("endTime")} />}
        </Field>
        <Field label="Reason (optional, only you see it)" error={errors.reason?.message} className="ad-span-2">
          {(p) => <input {...p} className="field-input" maxLength={80} {...register("reason")} />}
        </Field>
      </div>
      <div className="ad-form-foot">
        <SubmitButton pending={pending} className="btn btn-secondary">
          Add time off
        </SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}
