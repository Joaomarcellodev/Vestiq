"use client";

import { useActionState, useEffect } from "react";
import { Button, TextField } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { changePassword, type ChangePasswordState } from "../actions";

const initialState: ChangePasswordState = {};

/** VES-92 — "Senha" section of /perfil. React clears the fields after each submit. */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ message: "Senha alterada.", variant: "success" });
  }, [state, toast]);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
      <p className="font-title-lg text-title-lg text-on-surface">Senha</p>
      <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
        Troque a senha que você usa para entrar. A sessão neste dispositivo continua ativa.
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-md rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-md space-y-md" noValidate>
        <TextField
          label="Senha atual"
          name="current"
          autoComplete="current-password"
          leadingIcon="lock"
          revealable
          required
          error={state.fieldErrors?.current}
        />
        <div className="grid gap-md sm:grid-cols-2">
          <TextField
            label="Nova senha"
            name="password"
            autoComplete="new-password"
            leadingIcon="lock"
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
            revealable
            required
            error={state.fieldErrors?.confirm}
          />
        </div>
        <Button type="submit" variant="secondary" loading={pending} className="w-full sm:w-auto">
          Alterar senha
        </Button>
      </form>
    </section>
  );
}
