"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { addReviewAction, inviteMemberAction, removeMemberAction, removeReviewAction, resendInviteAction } from "@/app/admin/_actions/shop";
import { inviteSchema, reviewSchema, type InviteFormInput, type ReviewFormInput } from "@/validation/admin";
import { ActionButton, CopyButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

type Member = { id: string; userId: string; name: string; email: string; role: "owner" | "staff"; hasPassword: boolean };

/** Who can sign in to this shop's admin, and inviting more people. */
export function People({ businessId, members, me }: { businessId: string; members: Member[]; me: string }) {
  const [link, setLink] = useState<string | null>(null);
  const form = useForm<InviteFormInput>({ resolver: zodResolver(inviteSchema) as never, defaultValues: { email: "", name: "", role: "staff" } });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => inviteMemberAction(businessId, v), { resetOnSuccess: true, onSuccess: (d) => setLink(d.url) });

  return (
    <section className="ad-card" aria-labelledby="people-title">
      <h2 id="people-title">People with access</h2>
      <p className="ad-card-intro">Owners can change everything. Staff see the day and manage bookings.</p>
      <ul className="ad-list" style={{ marginBottom: 16 }}>
        {members.map((m) => (
          <li key={m.id} className="ad-row">
            <span className="ad-row-main">
              <span className="ad-row-title">
                {m.name}
                {m.userId === me ? " (you)" : ""}
              </span>
              <span className="ad-row-meta">
                {m.email} · {m.role === "owner" ? "Owner" : "Staff"}
                {m.hasPassword ? "" : " · invite pending"}
              </span>
            </span>
            <span className="ad-row-side">
              {!m.hasPassword && (
                <ActionButton action={async () => {
                  const r = await resendInviteAction(businessId, m.userId);
                  if (r.ok) setLink(r.data.url);
                  return r;
                }} className="btn btn-link">
                  Resend invite
                </ActionButton>
              )}
              {m.userId !== me && (
                <ActionButton action={() => removeMemberAction(businessId, m.id)} className="btn btn-link" confirm={`Remove ${m.name}?`} confirmLabel="Remove">
                  Remove
                </ActionButton>
              )}
            </span>
          </li>
        ))}
      </ul>
      {link && (
        <p className="ad-note" role="status">
          Invite sent. You can also share this link yourself (it works once, for 24 hours):{" "}
          <span style={{ wordBreak: "break-all" }}>{link}</span> <CopyButton value={link} label="Copy link" />
        </p>
      )}
      <form onSubmit={submit} className="ad-form" noValidate style={{ marginTop: 12 }}>
        <div className="ad-grid cols-3">
          <Field label="Name" error={errors.name?.message}>
            {(p) => <input {...p} className="field-input" autoComplete="off" {...register("name")} />}
          </Field>
          <Field label="Email" error={errors.email?.message}>
            {(p) => <input {...p} type="email" className="field-input" autoComplete="off" {...register("email")} />}
          </Field>
          <Field label="Role">
            {(p) => (
              <select {...p} className="field-input" {...register("role")}>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            )}
          </Field>
        </div>
        <div className="ad-form-foot">
          <SubmitButton pending={pending} className="btn btn-secondary" pendingLabel="Inviting…">
            Send invite
          </SubmitButton>
          <FormStatus status={status} />
        </div>
      </form>
    </section>
  );
}

/** Hand-picked reviews shown on the storefront. */
export function Reviews({ businessId, reviews }: { businessId: string; reviews: { id: string; quote: string; author: string; source: string }[] }) {
  const form = useForm<ReviewFormInput>({ resolver: zodResolver(reviewSchema) as never, defaultValues: { quote: "", author: "", source: "Google" } });
  const { register, formState: { errors } } = form;
  const { submit, status, pending } = useFormAction(form, (v) => addReviewAction(businessId, v), { resetOnSuccess: true });
  return (
    <section className="ad-card" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Reviews</h2>
      <p className="ad-card-intro">Paste a few real reviews (e.g. from Google) to show on your storefront.</p>
      {reviews.length > 0 && (
        <ul className="ad-list" style={{ marginBottom: 16 }}>
          {reviews.map((r) => (
            <li key={r.id} className="ad-row">
              <span className="ad-row-main">
                <span>“{r.quote}”</span>
                <span className="ad-row-meta">
                  {r.author} · {r.source}
                </span>
              </span>
              <ActionButton action={() => removeReviewAction(businessId, r.id)} className="btn btn-link" confirm="Remove this review?" confirmLabel="Remove">
                Remove
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="ad-form" noValidate>
        <Field label="Review" error={errors.quote?.message}>
          {(p) => <textarea {...p} className="field-input" rows={2} maxLength={400} {...register("quote")} />}
        </Field>
        <div className="ad-grid cols-2">
          <Field label="Author" error={errors.author?.message}>
            {(p) => <input {...p} className="field-input" maxLength={60} {...register("author")} />}
          </Field>
          <Field label="Source" error={errors.source?.message}>
            {(p) => <input {...p} className="field-input" maxLength={30} {...register("source")} />}
          </Field>
        </div>
        <div className="ad-form-foot">
          <SubmitButton pending={pending} className="btn btn-secondary">
            Add review
          </SubmitButton>
          <FormStatus status={status} />
        </div>
      </form>
    </section>
  );
}
