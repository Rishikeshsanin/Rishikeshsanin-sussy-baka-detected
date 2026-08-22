"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

export function Modal({
  open,
  title,
  eyebrow,
  children,
  onClose,
  className = "",
}: ModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-panel ${className}`}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            {eyebrow ? <p className="eyebrow-label">{eyebrow}</p> : null}
            <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="icon-button shrink-0"
            aria-label={`Close ${title}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
