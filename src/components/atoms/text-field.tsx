"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Material Symbols name rendered inside the field, on the left. */
  leadingIcon?: string;
  error?: string;
  hint?: string;
  /** Renders a show/hide toggle. Forces type between "password" and "text". */
  revealable?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, leadingIcon, error, hint, revealable, className, id, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const [revealed, setRevealed] = useState(false);
  const resolvedType = revealable ? (revealed ? "text" : "password") : type;

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
      >
        {label}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-outline">
            <Icon name={leadingIcon} size={20} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "field-focus-ring block w-full rounded-lg border bg-surface-container-lowest py-3 font-body-md text-body-md text-on-surface placeholder-outline transition-all duration-200",
            leadingIcon ? "pl-10" : "pl-3",
            revealable ? "pr-10" : "pr-3",
            error ? "border-error" : "border-outline-variant",
            className,
          )}
          {...props}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-outline transition-colors hover:text-primary-container"
          >
            <Icon name={revealed ? "visibility_off" : "visibility"} size={20} />
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-xs font-body-md text-body-md text-error">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${inputId}-hint`}
          className="mt-xs font-body-md text-body-md text-on-surface-variant"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
});
