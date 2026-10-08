"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelBookingAction, type CancelState } from "./actions";

const initial: CancelState = { status: "idle" };

/** G-1/G-2: "Cancel booking" opens an inline confirm panel; focus moves to "Keep it". */
export function CancelForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(cancelBookingAction, initial);
  const [confirming, setConfirming] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);

  if (state.status === "cancelled") {
    return (
      <div className="mb-panel panel-in" role="status">
        <strong>This booking has been cancelled.</strong>
        <span className="text-muted">A confirmation email is on its way. Nothing to pay.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!confirming ? (
        <button ref={opener} type="button" className="btn btn-danger-outline btn-md self-start" onClick={() => setConfirming(true)}>
          Cancel booking
        </button>
      ) : (
        <form
          action={formAction}
          className="mb-panel panel-in"
          data-tone="danger"
          role="alertdialog"
          aria-labelledby="cancel-title"
          aria-describedby="cancel-text"
        >
          <input type="hidden" name="token" value={token} />
          <strong id="cancel-title">Cancel this appointment?</strong>
          <span id="cancel-text" className="text-muted">
            Your time will be released to other customers. This can’t be undone.
          </span>
          <div className="mb-actions">
            <button type="submit" className="btn btn-danger btn-md" disabled={pending} aria-busy={pending}>
              {pending && <span className="spinner" aria-hidden />}
              {pending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              ref={keep}
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => {
                setConfirming(false);
                requestAnimationFrame(() => opener.current?.focus());
              }}
            >
              Keep it
            </button>
          </div>
        </form>
      )}
      {state.status === "error" && (
        <p role="alert" className="field-error m-0">
          {state.message}
        </p>
      )}
    </div>
  );
}
