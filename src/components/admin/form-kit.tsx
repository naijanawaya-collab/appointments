"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { ActionResult } from "@/lib/action";

/**
 * Small kit every admin form uses, so success, field errors and failures
 * look and behave the same everywhere.
 *
 * Forms validate on the client with the shared Zod schema (instant
 * feedback), then send the RAW form values to a Server Action, which
 * re-validates with the same schema; the client is never trusted.
 */

export type FormStatusState = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

export function useFormAction<F extends FieldValues, R>(
  form: UseFormReturn<F, unknown, unknown>,
  action: (values: F) => Promise<ActionResult<R>>,
  opts: { success?: string; onSuccess?: (data: R) => void; resetOnSuccess?: boolean } = {},
) {
  const [status, setStatus] = useState<FormStatusState>({ kind: "idle" });
  const submit = form.handleSubmit(
    async () => {
      setStatus({ kind: "idle" });
      const result = await action(form.getValues());
      if (result.ok) {
        setStatus({ kind: "ok", message: result.message ?? opts.success ?? "Saved." });
        if (opts.resetOnSuccess) form.reset();
        opts.onSuccess?.(result.data);
        return;
      }
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name as Path<F>, { type: "server", message }, { shouldFocus: true });
      }
      setStatus({ kind: "error", message: result.error });
    },
    () => setStatus({ kind: "error", message: "Please check the highlighted fields." }),
  );
  return { submit, status, setStatus, pending: form.formState.isSubmitting };
}

export function FormStatus({ status }: { status: FormStatusState }) {
  return (
    <p className={`ad-form-status ${status.kind === "error" ? "is-error" : status.kind === "ok" ? "is-ok" : ""}`} role={status.kind === "error" ? "alert" : "status"}>
      {status.kind === "idle" ? "" : status.kind === "error" ? `! ${status.message}` : status.message}
    </p>
  );
}

export function SubmitButton({ pending, children, pendingLabel = "Saving…", className = "btn btn-primary" }: { pending: boolean; children: ReactNode; pendingLabel?: string; className?: string }) {
  return (
    <button type="submit" className={className} aria-disabled={pending || undefined} disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Label + control + hint + "! error", wired with ids for screen readers. */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          ! {error}
        </p>
      )}
    </div>
  );
}

/**
 * A button that runs a (bound) Server Action, with an optional inline
 * "Are you sure?" step instead of window.confirm.
 */
export function ActionButton({
  action,
  children,
  className = "btn btn-secondary",
  confirm,
  confirmLabel = "Yes",
  pendingLabel,
  onDone,
  ariaLabel,
  disabled,
}: {
  action: () => Promise<ActionResult<unknown>>;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  confirm?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  onDone?: () => void;
  ariaLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setError(null);
      const result = await action();
      setAsking(false);
      if (result.ok) onDone?.();
      else setError(result.error);
    });

  if (asking) {
    return (
      <span className="ad-confirm" role="group" aria-label={confirm}>
        <span>{confirm}</span>
        <button type="button" className="btn btn-danger" onClick={run} disabled={pending} autoFocus>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)} disabled={pending}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <span className="ad-confirm">
      <button type="button" className={className} onClick={confirm ? () => setAsking(true) : run} disabled={pending || disabled} aria-label={ariaLabel}>
        {pending && <span className="spinner" aria-hidden="true" />}
        {pending && pendingLabel ? pendingLabel : children}
      </button>
      {error && (
        <span className="field-error" role="alert">
          ! {error}
        </span>
      )}
    </span>
  );
}

/** Copies a value to the clipboard (DNS records, invite links). */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: the value is visible to copy by hand */
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
