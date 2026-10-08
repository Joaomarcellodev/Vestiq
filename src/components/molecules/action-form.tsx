"use client";

import { createContext, useActionState, useContext, useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/atoms/button";

export type FormActionState = { error?: string };

type Submitter = { name: string; value: string } | null;

const ActionFormContext = createContext<{ pending: boolean; submitter: Submitter }>({
  pending: false,
  submitter: null,
});

/**
 * Form for Server Actions that redirect on success and return `{ error }` on
 * failure. The error is shown above the fields instead of throwing to the
 * route's error boundary, and the submission goes through `onSubmit` so React
 * doesn't reset what the user typed when the action fails. Before hydration
 * the native `action` still posts the form.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const [submitter, setSubmitter] = useState<Submitter>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const button = (event.nativeEvent as SubmitEvent).submitter;
    const clicked =
      button instanceof HTMLButtonElement && button.name
        ? { name: button.name, value: button.value }
        : null;
    if (clicked) formData.set(clicked.name, clicked.value);
    setSubmitter(clicked);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className={className}>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <ActionFormContext.Provider value={{ pending, submitter }}>
        {children}
      </ActionFormContext.Provider>
    </form>
  );
}

/** Submit button that shows the spinner while its `ActionForm` is running. */
export function SubmitButton({ name, value, ...props }: ButtonProps) {
  const { pending, submitter } = useContext(ActionFormContext);
  const clicked = !submitter || (submitter.name === name && submitter.value === String(value));
  return (
    <Button
      {...props}
      type="submit"
      name={name}
      value={value}
      disabled={props.disabled || pending}
      loading={pending && clicked}
    />
  );
}
