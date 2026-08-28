"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { acceptInvite, type ActionState } from "../actions";

export function AcceptInviteForm({ token }: { token: string }) {
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
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Aceitar convite
      </Button>
    </form>
  );
}
