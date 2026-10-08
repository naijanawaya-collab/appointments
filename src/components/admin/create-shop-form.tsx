"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { checkSlugAction, createShopAction } from "@/app/admin/_actions/operator";
import { slugify } from "@/domain/business/site";
import { PRESETS, PRESET_KEYS } from "@/domain/theme/presets";
import { createShopSchema, type CreateShopFormInput } from "@/validation/admin";
import { CopyButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

/** Operator: create a shop + invite its owner (MVP-PLAN M4 §3). */
export function CreateShopForm({ platformUrl }: { platformUrl: string }) {
  const [created, setCreated] = useState<{ slug: string; inviteUrl: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const form = useForm<CreateShopFormInput>({
    resolver: zodResolver(createShopSchema) as never,
    mode: "onBlur",
    defaultValues: { name: "", slug: "", preset: "classic", category: "barber", timezone: "Europe/Vienna", ownerEmail: "", ownerName: "" },
  });
  const { register, formState: { errors } } = form;
  const slug = useWatch({ control: form.control, name: "slug" });
  const { submit, status, pending } = useFormAction(form, createShopAction, { onSuccess: (d) => setCreated(d) });

  if (created) {
    return (
      <div className="ad-form">
        <p className="ad-note" role="status">
          <strong>{created.slug}</strong> is ready and the owner was emailed an invite. You can also send them this link (works once, for 24 hours):
        </p>
        <p style={{ wordBreak: "break-all", margin: 0 }}>
          <code>{created.inviteUrl}</code> <CopyButton value={created.inviteUrl} label="Copy invite link" />
        </p>
        <div className="ad-actions">
          <Link href={`/admin/${created.slug}`} className="btn btn-primary">
            Open its admin
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setCreated(null);
              setSlugTouched(false);
              form.reset();
            }}
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <div className="ad-grid cols-2">
        <Field label="Shop name" error={errors.name?.message}>
          {(p) => (
            <input
              {...p}
              className="field-input"
              {...register("name", {
                onChange: (e) => {
                  if (!slugTouched) form.setValue("slug", slugify(e.target.value));
                },
              })}
            />
          )}
        </Field>
        <Field label="Address on the platform" error={errors.slug?.message} hint={`${platformUrl.replace(/^https?:\/\//, "")}/${slug || "your-shop"}`}>
          {(p) => (
            <input
              {...p}
              className="field-input"
              autoCapitalize="off"
              spellCheck={false}
              {...register("slug", {
                onChange: () => setSlugTouched(true),
                onBlur: async (e) => {
                  const value = String(e.target.value);
                  if (!value) return;
                  const r = await checkSlugAction(value);
                  if (r.ok && r.data.problem) form.setError("slug", { type: "server", message: r.data.problem });
                },
              })}
            />
          )}
        </Field>
        <Field label="Style">
          {(p) => (
            <select {...p} className="field-input" {...register("preset")}>
              {PRESET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PRESETS[k].label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Kind of business">
          {(p) => (
            <select {...p} className="field-input" {...register("category")}>
              <option value="barber">Barber</option>
              <option value="beauty">Beauty / nails</option>
              <option value="other">Other</option>
            </select>
          )}
        </Field>
        <Field label="Owner’s name" error={errors.ownerName?.message}>
          {(p) => <input {...p} className="field-input" autoComplete="off" {...register("ownerName")} />}
        </Field>
        <Field label="Owner’s email" error={errors.ownerEmail?.message} hint="They get an invite to set a password.">
          {(p) => <input {...p} type="email" className="field-input" autoComplete="off" {...register("ownerEmail")} />}
        </Field>
        <Field label="Time zone" error={errors.timezone?.message}>
          {(p) => <input {...p} className="field-input" {...register("timezone")} />}
        </Field>
      </div>
      <div className="ad-form-foot">
        <SubmitButton pending={pending} pendingLabel="Creating…">
          Create shop
        </SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}
