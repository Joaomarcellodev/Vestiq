"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { openNegotiation, type ActionState } from "../actions";

export function ProposeForm({ offerId, remaining }: { offerId: string; remaining: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(openNegotiation, {});

  return (
    <form
      action={action}
      className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface"
    >
      <input type="hidden" name="offerId" value={offerId} />
      <h2 className="font-headline-md text-headline-md text-on-surface">Solicitar negociação</h2>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField
        label={`Quantidade (até ${remaining})`}
        name="quantity"
        type="number"
        min="1"
        max={remaining}
        required
      />
      <TextField label="Valor proposto (R$)" name="amount" type="number" step="0.01" required />
      <TextField label="Mensagem" name="message" placeholder="Apresente sua proposta" />
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Enviar proposta
        </Button>
      </div>
    </form>
  );
}
