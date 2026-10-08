"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { deleteStaffAction, saveStaffAction } from "@/app/admin/_actions/team";
import type { MediaView } from "@/domain/media/image";
import { staffSchema, type StaffFormInput } from "@/validation/admin";
import { ActionButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";
import { MediaField } from "./media-field";
import { adminHref } from "./nav";

export function StaffForm({
  businessId,
  slug,
  staffId,
  defaults,
  photo: initialPhoto,
  services,
}: {
  businessId: string;
  slug: string;
  staffId: string | null;
  defaults: StaffFormInput;
  photo: MediaView | null;
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [photo, setPhoto] = useState(initialPhoto);
  const form = useForm<StaffFormInput>({ resolver: zodResolver(staffSchema) as never, defaultValues: defaults, mode: "onBlur" });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => saveStaffAction(businessId, staffId, v), {
    onSuccess: (data) => {
      if (!staffId) router.replace(adminHref(slug, `/team/${data.id}`));
    },
  });

  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <section className="ad-card">
        <div className="ad-grid cols-2">
          <Field label="Name" error={errors.displayName?.message}>
            {(p) => <input {...p} className="field-input" maxLength={60} {...register("displayName")} />}
          </Field>
          <Field label="Title (optional)" error={errors.title?.message} hint="e.g. Senior barber">
            {(p) => <input {...p} className="field-input" maxLength={60} {...register("title")} />}
          </Field>
          <Field label="Short bio (optional)" error={errors.bio?.message} className="ad-span-2">
            {(p) => <textarea {...p} className="field-input" rows={3} maxLength={500} {...register("bio")} />}
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <MediaField
            businessId={businessId}
            label="Photo"
            shape="round"
            value={photo}
            alt={form.getValues("displayName")}
            onChange={(m) => {
              setPhoto(m);
              form.setValue("photoMediaId", m?.id ?? "", { shouldDirty: true });
            }}
          />
        </div>
      </section>

      <section className="ad-card">
        <fieldset className="ad-fieldset">
          <legend className="ad-section-title">Services they offer</legend>
          {services.length === 0 ? (
            <p className="field-hint">No services yet. Add services, then tick the ones this person does.</p>
          ) : (
            <div className="ad-checks">
              {services.map((s) => (
                <label key={s.id} className="ad-check">
                  <input type="checkbox" value={s.id} {...register("serviceIds")} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <label className="ad-switch" style={{ marginTop: 16 }}>
          <input type="checkbox" {...register("isActive")} />
          Takes bookings (shown on the booking page)
        </label>
      </section>

      <div className="ad-form-foot">
        <SubmitButton pending={pending}>{staffId ? "Save changes" : "Add to team"}</SubmitButton>
        <FormStatus status={status} />
        {staffId && (
          <span style={{ marginLeft: "auto" }}>
            <ActionButton
              action={() => deleteStaffAction(businessId, staffId)}
              className="btn btn-danger-outline"
              confirm="Remove from the team?"
              confirmLabel="Remove"
              onDone={() => router.replace(adminHref(slug, "/team"))}
            >
              Remove
            </ActionButton>
          </span>
        )}
      </div>
    </form>
  );
}
