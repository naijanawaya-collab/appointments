"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createWalkInAction, walkInSlotsAction } from "@/app/admin/_actions/bookings";
import { newIdempotencyKey } from "@/components/booking/api";
import { clockTime, formatDuration, formatMoney } from "@/lib/format";
import { walkInSchema, type WalkInFormInput } from "@/validation/admin";
import { Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";
import { adminHref } from "./nav";

type Service = { id: string; name: string; durationMin: number; priceCents: number; categoryId: string | null; staffIds: string[] };
type Values = WalkInFormInput & { date: string };

export function WalkInForm({
  business,
  services,
  categories,
  team,
  initialDate,
  today,
}: {
  business: { id: string; slug: string; timezone: string; currency: string; locale: string };
  services: Service[];
  categories: { id: string; name: string }[];
  team: { id: string; name: string }[];
  initialDate: string;
  today: string;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(newIdempotencyKey);
  const form = useForm<Values>({
    resolver: zodResolver(walkInSchema) as never,
    defaultValues: { serviceIds: [], staffId: "any", startsAt: "", name: "", email: "", phone: "", note: "", source: "walk_in", date: initialDate },
  });
  const { register, control, formState: { errors } } = form;
  const [serviceIds, staffId, date] = useWatch({ control, name: ["serviceIds", "staffId", "date"] });
  const selected = useMemo(() => services.filter((s) => serviceIds?.includes(s.id)), [services, serviceIds]);
  // Only professionals who do every selected service.
  const eligible = team.filter((t) => selected.every((s) => s.staffIds.includes(t.id)));

  const slots = useQuery({
    queryKey: ["walk-in-slots", business.id, date, serviceIds, staffId],
    enabled: Boolean(date && serviceIds?.length),
    staleTime: 15_000,
    queryFn: async () => {
      const r = await walkInSlotsAction(business.id, { date, serviceIds, staffId: staffId || "any" });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const { submit, status, pending } = useFormAction(form, (v) => createWalkInAction(business.id, v, idempotencyKey), {
    onSuccess: (data) => router.push(adminHref(business.slug, `/bookings/${data.bookingId}`)),
  });

  const groups = [...categories.map((c) => ({ ...c, items: services.filter((s) => s.categoryId === c.id) })), { id: "none", name: "Other", items: services.filter((s) => !s.categoryId || !categories.some((c) => c.id === s.categoryId)) }].filter((g) => g.items.length);
  const total = selected.reduce((sum, s) => sum + s.priceCents, 0);
  const minutes = selected.reduce((sum, s) => sum + s.durationMin, 0);

  if (!services.length) return <p className="ad-empty">Add a service first, then you can book walk-ins.</p>;

  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <section className="ad-card">
        <fieldset className="ad-fieldset">
          <legend className="ad-section-title">Services</legend>
          {groups.map((g) => (
            <div key={g.id} style={{ marginBottom: 12 }}>
              {groups.length > 1 && <p className="ad-group-title">{g.name}</p>}
              <div className="ad-checks">
                {g.items.map((s) => (
                  <label key={s.id} className="ad-check">
                    <input
                      type="checkbox"
                      value={s.id}
                      {...register("serviceIds", { onChange: () => form.setValue("startsAt", "") })}
                    />
                    <span>
                      {s.name}
                      <span className="ad-row-meta"> · {formatDuration(s.durationMin)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {errors.serviceIds && <p className="field-error">! {errors.serviceIds.message}</p>}
          {selected.length > 0 && (
            <p className="field-hint">
              {formatDuration(minutes)} · {formatMoney(total, business.currency, business.locale)}
            </p>
          )}
        </fieldset>
      </section>

      <section className="ad-card">
        <h2>When</h2>
        <div className="ad-grid cols-2" style={{ marginTop: 12 }}>
          <Field label="Professional">
            {(p) => (
              <select {...p} className="field-input" {...register("staffId", { onChange: () => form.setValue("startsAt", "") })}>
                <option value="any">Whoever is free</option>
                {eligible.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Date">
            {(p) => <input {...p} type="date" min={today} className="field-input" {...register("date", { onChange: () => form.setValue("startsAt", "") })} />}
          </Field>
        </div>
        <fieldset className="ad-fieldset" style={{ marginTop: 16 }}>
          <legend>Time</legend>
          {!serviceIds?.length ? (
            <p className="field-hint">Choose a service to see free times.</p>
          ) : slots.isPending ? (
            <p className="field-hint" role="status">
              <span className="spinner" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />
              Finding free times…
            </p>
          ) : slots.isError ? (
            <p className="field-error" role="alert">
              ! Couldn’t load times. {slots.error.message}
            </p>
          ) : slots.data.length === 0 ? (
            <p className="field-hint">No free times on this day. Try another day or professional.</p>
          ) : (
            <div className="ad-checks" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}>
              {slots.data.map((slot) => (
                <label key={slot.start} className="ad-check" style={{ justifyContent: "center" }}>
                  <input type="radio" value={slot.start} className="sr-only" {...register("startsAt")} />
                  <span className="tabular">{clockTime(new Date(slot.start), business.timezone)}</span>
                </label>
              ))}
            </div>
          )}
          {errors.startsAt && <p className="field-error">! {errors.startsAt.message}</p>}
        </fieldset>
      </section>

      <section className="ad-card">
        <h2>Customer</h2>
        <div className="ad-grid cols-2" style={{ marginTop: 12 }}>
          <Field label="Name" error={errors.name?.message}>
            {(p) => <input {...p} autoComplete="off" className="field-input" {...register("name")} />}
          </Field>
          <Field label="Phone (optional)" error={errors.phone?.message}>
            {(p) => <input {...p} type="tel" autoComplete="off" className="field-input" {...register("phone")} />}
          </Field>
          <Field label="Email (optional)" error={errors.email?.message} hint="We’ll email them a confirmation with a link to cancel.">
            {(p) => <input {...p} type="email" autoComplete="off" className="field-input" {...register("email")} />}
          </Field>
          <Field label="Note (optional)" error={errors.note?.message}>
            {(p) => <input {...p} className="field-input" {...register("note")} />}
          </Field>
        </div>
        <fieldset className="ad-fieldset" style={{ marginTop: 16 }}>
          <legend>Type</legend>
          <div className="ad-checks">
            <label className="ad-check">
              <input type="radio" value="walk_in" {...register("source")} />
              Walk-in
            </label>
            <label className="ad-check">
              <input type="radio" value="admin" {...register("source")} />
              Phone booking
            </label>
          </div>
        </fieldset>
      </section>

      <div className="ad-form-foot">
        <SubmitButton pending={pending} pendingLabel="Booking…">
          Add booking
        </SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}
