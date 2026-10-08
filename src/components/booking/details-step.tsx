"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import { customerDetailsSchema, type CustomerDetails, type CustomerDetailsInput } from "@/validation/booking";
import type { Details } from "./wizard-state";

export const DETAILS_FORM_ID = "booking-details";

type Props = {
  defaults: Details;
  shopName: string;
  noteLabel: string;
  /** Inline error from the server (network / 5xx). */
  error: string | null;
  /** Per-field errors from a 422 response. */
  fieldErrors: Record<string, string>;
  onChange: (details: Details) => void;
  onSubmit: (values: CustomerDetails) => void;
};

function Field({
  label,
  optional,
  hint,
  error,
  multiline,
  registration,
  ...inputProps
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: FieldError;
  multiline?: boolean;
  registration: UseFormRegisterReturn;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const common = { id, className: "field-input", "aria-invalid": !!error, "aria-describedby": describedBy, ...registration };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {multiline ? <textarea rows={3} {...common} /> : <input {...inputProps} {...common} />}
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          ! {error.message}
        </p>
      )}
    </div>
  );
}

/** Step 4 (B-16…B-19). Validates on blur and on submit; focuses the first invalid field. */
export function DetailsStep({ defaults, shopName, noteLabel, error, fieldErrors, onChange, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    subscribe,
    formState: { errors },
  } = useForm<CustomerDetailsInput, unknown, CustomerDetails>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { ...defaults, website: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Keep the flow's copy of the details in sync (B-19: values survive Back/forward and reloads).
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values: v }) => onChange({ name: v.name ?? "", email: v.email ?? "", phone: v.phone ?? "", note: v.note ?? "" }),
      }),
    [subscribe, onChange],
  );

  // 422 from the server → show its messages on the fields.
  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === "name" || field === "email" || field === "phone" || field === "note") {
        setError(field, { type: "server", message }, { shouldFocus: true });
      }
    }
  }, [fieldErrors, setError]);

  return (
    <form id={DETAILS_FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="bk-form">
      <Field label="Name" autoComplete="name" error={errors.name} registration={register("name")} />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        hint="We’ll send your confirmation here."
        error={errors.email}
        registration={register("email")}
      />
      <Field label="Phone" optional type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} registration={register("phone")} />
      <Field label={noteLabel} optional multiline error={errors.note} registration={register("note")} />

      {/* Honeypot: invisible to people and screen readers; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      {error && (
        <p role="alert" className="field-error m-0 text-[15px]">
          {error}
        </p>
      )}
      <p className="bk-consent m-0">By booking you agree that {shopName} stores your details to manage this appointment.</p>
    </form>
  );
}
