"use client";

import { useId, useRef } from "react";
import { Button, type ButtonProps } from "@/components/atoms/button";
import { useActionFormStatus } from "./action-form";

export interface ConfirmButtonProps extends Omit<ButtonProps, "type" | "onClick"> {
  /** Dialog heading, e.g. "Cancelar oferta?". */
  title: string;
  /** What happens, and whether it can be undone. */
  description: React.ReactNode;
  /** Label of the button that really submits. Defaults to the trigger's text. */
  confirmLabel?: string;
  /** Label of the button that closes the dialog. */
  cancelLabel?: string;
  /** For forms that aren't an `ActionForm` (which reports its own state). */
  pending?: boolean;
}

/**
 * VES-93 — a submit button that asks first. The trigger only opens a native
 * modal `<dialog>` (focus moves in and returns, Esc closes, the page behind is
 * inert); the dialog stays inside the form, so its confirm button is the real
 * submitter and carries `name`/`value` like the button it replaces.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  cancelLabel = "Voltar",
  pending: pendingProp,
  name,
  value,
  variant = "danger",
  children,
  disabled,
  ...props
}: ConfirmButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const form = useActionFormStatus();
  const sentByMe =
    !form.submitter || (form.submitter.name === name && form.submitter.value === String(value));
  const pending = pendingProp ?? (form.pending && sentByMe);
  const busy = pendingProp ?? form.pending;

  return (
    <>
      <Button
        {...props}
        variant={variant}
        disabled={disabled || busy}
        loading={pending}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-on-surface shadow-surface backdrop:bg-black/40"
      >
        <h2 id={titleId} className="font-title-lg text-title-lg text-on-surface">
          {title}
        </h2>
        <div id={descriptionId} className="mt-sm font-body-md text-body-md text-on-surface-variant">
          {description}
        </div>
        <div className="mt-lg flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" autoFocus onClick={() => dialog.current?.close()}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            // A quiet trigger (ghost/secondary) still gets a solid confirm button.
            variant={variant === "ghost" || variant === "secondary" ? "primary" : variant}
            name={name}
            value={value}
            // Close first: the click still submits the form the dialog sits in.
            onClick={() => dialog.current?.close()}
          >
            {confirmLabel ?? children}
          </Button>
        </div>
      </dialog>
    </>
  );
}
