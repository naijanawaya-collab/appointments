"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { geocodeAction, saveDetailsAction } from "@/app/admin/_actions/shop";
import { businessDetailsSchema, SLOT_INTERVALS, type BusinessDetailsFormInput } from "@/validation/admin";
import { Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

const ZONES = ["Europe/Vienna", "Europe/Berlin", "Europe/Zurich", "Europe/London", "Europe/Paris", "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam", "Europe/Warsaw", "Africa/Lagos", "America/New_York", "America/Chicago", "America/Los_Angeles"];

/** Shop details + booking rules (MVP-PLAN M4 §9). */
export function DetailsForm({ businessId, defaults }: { businessId: string; defaults: BusinessDetailsFormInput }) {
  const form = useForm<BusinessDetailsFormInput>({ resolver: zodResolver(businessDetailsSchema) as never, defaultValues: defaults, mode: "onBlur" });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => saveDetailsAction(businessId, v));
  const [geo, setGeo] = useState<{ pending: boolean; message: string | null; error: boolean }>({ pending: false, message: null, error: false });
  const zones = ZONES.includes(String(defaults.timezone)) ? ZONES : [String(defaults.timezone), ...ZONES];

  async function findOnMap() {
    setGeo({ pending: true, message: null, error: false });
    const r = await geocodeAction(businessId, String(form.getValues("address") ?? ""));
    if (!r.ok) return setGeo({ pending: false, message: r.error, error: true });
    form.setValue("lat", String(r.data.lat.toFixed(6)), { shouldDirty: true });
    form.setValue("lon", String(r.data.lon.toFixed(6)), { shouldDirty: true });
    setGeo({ pending: false, message: `Found: ${r.data.label}. Save to update the map.`, error: false });
  }

  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <section className="ad-card" aria-labelledby="sd-basics">
        <h2 id="sd-basics">The shop</h2>
        <p className="ad-card-intro">What customers see on your storefront and in their emails.</p>
        <div className="ad-grid cols-2">
          <Field label="Full name" error={errors.name?.message} className="ad-span-2">
            {(p) => <input {...p} className="field-input" maxLength={100} {...register("name")} />}
          </Field>
          <Field label="Short name" error={errors.shortName?.message} hint="Header and email sender, e.g. “Kaiser & Co.”">
            {(p) => <input {...p} className="field-input" maxLength={40} {...register("shortName")} />}
          </Field>
          <Field label="Monogram" error={errors.mark?.message} hint="1–3 letters, used when there’s no logo">
            {(p) => <input {...p} className="field-input" maxLength={3} {...register("mark")} />}
          </Field>
          <Field label="Eyebrow" error={errors.eyebrow?.message} hint="Small line above the name, e.g. “Since 1987 · Josefstadt”">
            {(p) => <input {...p} className="field-input" maxLength={60} {...register("eyebrow")} />}
          </Field>
          <Field label="Tagline" error={errors.tagline?.message}>
            {(p) => <input {...p} className="field-input" maxLength={140} {...register("tagline")} />}
          </Field>
          <Field label="About title" error={errors.aboutTitle?.message}>
            {(p) => <input {...p} className="field-input" maxLength={80} {...register("aboutTitle")} />}
          </Field>
          <Field label="Search description" error={errors.description?.message} hint="For Google and link previews (≤ 300 characters)">
            {(p) => <input {...p} className="field-input" maxLength={300} {...register("description")} />}
          </Field>
          <Field label="About" error={errors.about?.message} className="ad-span-2">
            {(p) => <textarea {...p} className="field-input" rows={5} maxLength={2000} {...register("about")} />}
          </Field>
        </div>
      </section>

      <section className="ad-card" aria-labelledby="sd-contact">
        <h2 id="sd-contact">Contact &amp; location</h2>
        <div className="ad-grid cols-2" style={{ marginTop: 12 }}>
          <Field label="Address" error={errors.address?.message} className="ad-span-2">
            {(p) => <input {...p} className="field-input" maxLength={200} autoComplete="street-address" {...register("address")} />}
          </Field>
          <div className="ad-span-2 ad-inline">
            <Field label="Latitude" error={errors.lat?.message} className="ad-grow">
              {(p) => <input {...p} inputMode="decimal" className="field-input" {...register("lat")} />}
            </Field>
            <Field label="Longitude" error={errors.lon?.message} className="ad-grow">
              {(p) => <input {...p} inputMode="decimal" className="field-input" {...register("lon")} />}
            </Field>
            <button type="button" className="btn btn-secondary" onClick={findOnMap} disabled={geo.pending}>
              {geo.pending && <span className="spinner" aria-hidden="true" />}
              Find on map
            </button>
          </div>
          {geo.message && (
            <p className={`ad-span-2 ${geo.error ? "field-error" : "field-hint"}`} role="status">
              {geo.error ? `! ${geo.message}` : geo.message}
            </p>
          )}
          <Field label="Phone" error={errors.phone?.message}>
            {(p) => <input {...p} type="tel" className="field-input" {...register("phone")} />}
          </Field>
          <Field label="Email" error={errors.email?.message} hint="Gets new-booking notifications; customers’ replies go here.">
            {(p) => <input {...p} type="email" className="field-input" {...register("email")} />}
          </Field>
          <Field label="WhatsApp (optional)" error={errors.whatsapp?.message} hint="Defaults to the phone number">
            {(p) => <input {...p} type="tel" className="field-input" {...register("whatsapp")} />}
          </Field>
          <Field label="Instagram (optional)" error={errors.instagram?.message} hint="@handle or profile link">
            {(p) => <input {...p} className="field-input" {...register("instagram")} />}
          </Field>
          <Field label="TikTok (optional)" error={errors.tiktok?.message}>
            {(p) => <input {...p} className="field-input" {...register("tiktok")} />}
          </Field>
          <div className="ad-inline">
            <Field label="Google rating" error={errors.ratingValue?.message} className="ad-grow">
              {(p) => <input {...p} inputMode="decimal" placeholder="4.9" className="field-input" {...register("ratingValue")} />}
            </Field>
            <Field label="Reviews" error={errors.ratingCount?.message} className="ad-grow">
              {(p) => <input {...p} inputMode="numeric" placeholder="212" className="field-input" {...register("ratingCount")} />}
            </Field>
          </div>
          <Field label="Legal notice (Impressum)" error={errors.legalNotice?.message} className="ad-span-2" hint="Company register number, VAT ID, chamber… shown on your legal page.">
            {(p) => <textarea {...p} className="field-input" rows={3} maxLength={2000} {...register("legalNotice")} />}
          </Field>
        </div>
      </section>

      <section className="ad-card" aria-labelledby="sd-rules">
        <h2 id="sd-rules">Booking rules</h2>
        <div className="ad-grid cols-2" style={{ marginTop: 12 }}>
          <Field label="Time zone" error={errors.timezone?.message}>
            {(p) => (
              <select {...p} className="field-input" {...register("timezone")}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace("_", " ")}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Start times every" error={errors.slotIntervalMin?.message}>
            {(p) => (
              <select {...p} className="field-input" {...register("slotIntervalMin")}>
                {SLOT_INTERVALS.map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Earliest online booking (minutes ahead)" error={errors.minLeadTimeMin?.message} hint="e.g. 60 = nobody books for the next hour">
            {(p) => <input {...p} type="number" min={0} max={2880} className="field-input" {...register("minLeadTimeMin")} />}
          </Field>
          <Field label="Book up to (days ahead)" error={errors.maxAdvanceDays?.message}>
            {(p) => <input {...p} type="number" min={1} max={365} className="field-input" {...register("maxAdvanceDays")} />}
          </Field>
          <Field label="Free cancellation until (hours before)" error={errors.cancellationWindowHours?.message}>
            {(p) => <input {...p} type="number" min={0} max={168} className="field-input" {...register("cancellationWindowHours")} />}
          </Field>
        </div>
      </section>

      <div className="ad-form-foot">
        <SubmitButton pending={pending}>Save details</SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}
