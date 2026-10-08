"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { deleteServiceAction, saveServiceAction } from "@/app/admin/_actions/catalog";
import type { MediaView } from "@/domain/media/image";
import { serviceSchema, type ServiceFormInput } from "@/validation/admin";
import { ActionButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";
import { MediaField } from "./media-field";
import { adminHref } from "./nav";

export function ServiceForm({
  businessId,
  slug,
  serviceId,
  defaults,
  image: initialImage,
  categories,
  team,
}: {
  businessId: string;
  slug: string;
  serviceId: string | null;
  defaults: ServiceFormInput;
  image: MediaView | null;
  categories: { id: string; name: string }[];
  team: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [image, setImage] = useState(initialImage);
  const form = useForm<ServiceFormInput>({ resolver: zodResolver(serviceSchema) as never, defaultValues: defaults, mode: "onBlur" });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => saveServiceAction(businessId, serviceId, v), {
    onSuccess: (data) => {
      if (!serviceId) router.replace(adminHref(slug, `/services/${data.id}`));
    },
  });

  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <section className="ad-card">
        <div className="ad-grid cols-2">
          <Field label="Name" error={errors.name?.message} className="ad-span-2">
            {(p) => <input {...p} className="field-input" maxLength={80} {...register("name")} />}
          </Field>
          <Field label="Duration (minutes)" error={errors.durationMin?.message}>
            {(p) => <input {...p} type="number" inputMode="numeric" min={5} max={600} step={5} className="field-input" {...register("durationMin")} />}
          </Field>
          <Field label="Price" error={errors.price?.message} hint="e.g. 25 or 25,50">
            {(p) => <input {...p} inputMode="decimal" className="field-input" {...register("price")} />}
          </Field>
          <Field label="Clean-up time (minutes)" error={errors.bufferMin?.message} hint="Blocked after the appointment, not shown to customers.">
            {(p) => <input {...p} type="number" inputMode="numeric" min={0} max={120} step={5} className="field-input" {...register("bufferMin")} />}
          </Field>
          <Field label="Category" error={errors.categoryId?.message}>
            {(p) => (
              <select {...p} className="field-input" {...register("categoryId")}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Description (optional)" error={errors.description?.message} className="ad-span-2">
            {(p) => <textarea {...p} className="field-input" rows={3} maxLength={500} {...register("description")} />}
          </Field>
        </div>
      </section>

      <section className="ad-card">
        <fieldset className="ad-fieldset">
          <legend className="ad-section-title">Who does it</legend>
          {team.length === 0 ? (
            <p className="field-hint">Add your team first; then choose who offers this service.</p>
          ) : (
            <div className="ad-checks">
              {team.map((t) => (
                <label key={t.id} className="ad-check">
                  <input type="checkbox" value={t.id} {...register("staffIds")} />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </section>

      <section className="ad-card">
        <MediaField
          businessId={businessId}
          label="Photo (optional)"
          value={image}
          alt={form.getValues("name")}
          onChange={(m) => {
            setImage(m);
            form.setValue("imageMediaId", m?.id ?? "", { shouldDirty: true });
          }}
        />
        <label className="ad-switch" style={{ marginTop: 16 }}>
          <input type="checkbox" {...register("isActive")} />
          Bookable online
        </label>
      </section>

      <div className="ad-form-foot">
        <SubmitButton pending={pending}>{serviceId ? "Save changes" : "Create service"}</SubmitButton>
        <FormStatus status={status} />
        {serviceId && (
          <span style={{ marginLeft: "auto" }}>
            <ActionButton
              action={() => deleteServiceAction(businessId, serviceId)}
              className="btn btn-danger-outline"
              confirm="Delete this service? Past bookings keep their details."
              confirmLabel="Delete"
              onDone={() => router.replace(adminHref(slug, "/services"))}
            >
              Delete service
            </ActionButton>
          </span>
        )}
      </div>
    </form>
  );
}
