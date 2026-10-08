"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { cancelBookingAdminAction, saveInternalNoteAction, setOutcomeAction } from "@/app/admin/_actions/bookings";
import { ActionButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

export function BookingActions({
  businessId,
  bookingId,
  actions,
  hasEmail,
}: {
  businessId: string;
  bookingId: string;
  actions: { cancel: boolean; complete: boolean; noShow: boolean };
  hasEmail: boolean;
}) {
  const [cancelling, setCancelling] = useState(false);
  const form = useForm<{ reason: string; notify: boolean }>({ defaultValues: { reason: "", notify: hasEmail } });
  const { submit, status, pending } = useFormAction(form, (v) => cancelBookingAdminAction(businessId, bookingId, v), {
    onSuccess: () => setCancelling(false),
  });

  return (
    <section className="ad-card" aria-label="Actions">
      <div className="ad-actions">
        {actions.complete && (
          <ActionButton action={() => setOutcomeAction(businessId, bookingId, "completed")} className="btn btn-primary">
            Mark completed
          </ActionButton>
        )}
        {actions.noShow && <ActionButton action={() => setOutcomeAction(businessId, bookingId, "no_show")}>No-show</ActionButton>}
        {actions.cancel && !cancelling && (
          <button type="button" className="btn btn-danger-outline" onClick={() => setCancelling(true)}>
            Cancel booking
          </button>
        )}
      </div>
      {cancelling && (
        <form onSubmit={submit} className="ad-form" style={{ marginTop: 16 }} noValidate>
          <Field label="Reason (optional)" hint="Shown to the customer in the email.">
            {(p) => <input {...p} className="field-input" maxLength={200} {...form.register("reason")} />}
          </Field>
          {hasEmail && (
            <label className="ad-switch">
              <input type="checkbox" {...form.register("notify")} />
              Email the customer
            </label>
          )}
          <div className="ad-form-foot">
            <SubmitButton pending={pending} className="btn btn-danger" pendingLabel="Cancelling…">
              Yes, cancel booking
            </SubmitButton>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelling(false)}>
              Keep it
            </button>
          </div>
        </form>
      )}
      <FormStatus status={status} />
    </section>
  );
}

export function InternalNoteForm({ businessId, bookingId, note }: { businessId: string; bookingId: string; note: string }) {
  const form = useForm<{ note: string }>({ defaultValues: { note } });
  const { submit, status, pending } = useFormAction(form, (v) => saveInternalNoteAction(businessId, bookingId, v));
  return (
    <form onSubmit={submit} className="ad-form" noValidate>
      <Field label="Note">{(p) => <textarea {...p} className="field-input" maxLength={1000} rows={3} {...form.register("note")} />}</Field>
      <div className="ad-form-foot">
        <SubmitButton pending={pending}>Save note</SubmitButton>
        <FormStatus status={status} />
      </div>
    </form>
  );
}
