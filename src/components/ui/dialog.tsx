"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Modal dialog on the native <dialog> element: the browser handles the focus
 * trap, Esc, the backdrop and returning focus to the opener.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`ui-dialog ui-dialog-${size} ${className}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, outside the panel) closes.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="ui-dialog-panel">
          <header className="ui-dialog-head">
            <h2 id={titleId} className="ui-dialog-title">
              {title}
            </h2>
            <button type="button" className="btn-icon" aria-label="Close" onClick={onClose}>
              <X size={18} aria-hidden />
            </button>
          </header>
          <div className="ui-dialog-body">{children}</div>
          {footer && <footer className="ui-dialog-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
