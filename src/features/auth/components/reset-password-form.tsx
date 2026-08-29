"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, TextField } from "@/components/atoms";
import { updatePassword, type NewPasswordState } from "../actions";

const initialState: NewPasswordState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <div className="w-full max-w-md">
      {state.error && (
        <div
          role="alert"
          className="mb-md rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-md" noValidate>
        <TextField
          label="Nova senha"
          name="password"
          autoComplete="new-password"
          leadingIcon="lock"
          placeholder="••••••••"
          revealable
          required
          hint="No mínimo 8 caracteres."
          error={state.fieldErrors?.password}
        />

        <TextField
          label="Confirmar nova senha"
          name="confirm"
          autoComplete="new-password"
          leadingIcon="lock"
          placeholder="••••••••"
          revealable
          required
          error={state.fieldErrors?.confirm}
        />

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Redefinir senha
        </Button>
      </form>

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        O link expirou?{" "}
        <Link
          href="/recuperar-senha"
          className="font-semibold text-primary-container hover:text-primary"
        >
          Solicitar outro
        </Link>
      </p>
    </div>
  );
}
