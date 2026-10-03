"use client";

import { useActionState, useState } from "react";
import { cancelBookingAction, type CancelState } from "./actions";

const initial: CancelState = { status: "idle" };

/** Two-step cancel (ask, then confirm) to prevent accidental taps on mobile. */
export function CancelForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(cancelBookingAction, initial);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "cancelled") {
    return (
      <p role="status" className="rounded-lg border border-line bg-surface p-4 text-sm">
        This booking has been cancelled. A confirmation email is on its way.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
        >
          Cancel booking
        </button>
      ) : (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="token" value={token} />
          <span className="text-sm">Cancel this appointment?</span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-sm underline">
            Keep it
          </button>
        </form>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </div>
  );
}
