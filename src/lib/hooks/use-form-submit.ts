"use client";

import { useActionState, useTransition } from "react";

/**
 * `useActionState` for forms that must keep what the user typed when the
 * action fails (VES-77). React 19 resets a `<form action={fn}>` after every
 * submission; dispatching from `onSubmit` instead skips that reset. `prepare`
 * lets the form add derived fields (JSON of controlled rows, compressed files)
 * before sending. Spread `formProps` on the `<form>`: its `action` still posts
 * the form natively before hydration.
 */
export function useFormSubmit<State>(
  action: (prev: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
  prepare?: (formData: FormData) => void,
) {
  const [state, dispatch, actionPending] = useActionState(action, initialState);
  const [transitionPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name) {
      formData.set(submitter.name, submitter.value);
    }
    prepare?.(formData);
    startTransition(() => dispatch(formData));
  }

  return {
    state,
    pending: actionPending || transitionPending,
    formProps: { action: dispatch, onSubmit },
  };
}
