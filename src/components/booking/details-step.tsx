"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import {
  customerDetailsSchema,
  type CustomerDetails,
  type CustomerDetailsInput,
} from "@/validation/booking";

type Props = {
  error: string | null;
  onSubmit: (values: CustomerDetails) => void;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none transition focus:border-accent aria-[invalid=true]:border-danger";

/**
 * Accessible form field: the label stays short, hint and error are linked via
 * aria-describedby, so screen readers announce "Email, invalid, Enter a valid…".
 */
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
  const common = {
    id,
    className: inputClass,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
    ...registration,
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {multiline ? <textarea rows={3} {...common} /> : <input {...inputProps} {...common} />}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}

/** Step 4: guest details. No account needed – the confirmation email has a manage link. */
export function DetailsStep({ error, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerDetailsInput, unknown, CustomerDetails>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { name: "", email: "", phone: "", note: "", website: "" },
  });

  return (
    <form id="booking-details" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Name" autoComplete="name" error={errors.name} registration={register("name")} />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        hint="We'll send your confirmation here."
        error={errors.email}
        registration={register("email")}
      />
      <Field
        label="Phone"
        optional
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        error={errors.phone}
        registration={register("phone")}
      />
      <Field label="Note for the barber" optional multiline error={errors.note} registration={register("note")} />

      {/* Honeypot: invisible to people and screen readers; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        By booking you agree that the shop stores your details to manage this appointment.
      </p>
    </form>
  );
}
