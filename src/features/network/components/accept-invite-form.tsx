"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { acceptInvite, type ActionState } from "../actions";

export function AcceptInviteForm({
  token,
  needsPassword = false,
}: {
  token: string;
  /** Account created by the invite email — it sets its password here. */
  needsPassword?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInvite, {});

  return (
    <form action={action} className="space-y-md text-left">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField
        label="Nome da sua loja (opcional)"
        name="resellerName"
        placeholder="Ex: Atelier Sarah"
      />
      {needsPassword && (
        <>
          <TextField
            label="Crie sua senha"
            name="password"
            required
            minLength={8}
            revealable
            autoComplete="new-password"
            hint="No mínimo 8 caracteres. Você vai usá-la para entrar no Vestiq."
          />
          <TextField
            label="Confirme a senha"
            name="confirm"
            required
            revealable
            autoComplete="new-password"
          />
        </>
      )}
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Aceitar convite
      </Button>
    </form>
  );
}
