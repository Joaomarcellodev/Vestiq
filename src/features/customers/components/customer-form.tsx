"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { createCustomer, type ActionState } from "../actions";

export function CustomerForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCustomer, {});

  return (
    <form action={action} className="space-y-md">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField label="Nome" name="name" required />
      <TextField label="Email" name="email" type="email" />
      <TextField label="Telefone" name="phone" />
      <TextField label="CPF" name="document" placeholder="000.000.000-00" />
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Notas internas
        </label>
        <textarea
          name="notes"
          rows={3}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        />
      </div>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Salvar cliente
      </Button>
    </form>
  );
}
