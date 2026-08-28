"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { createCustomer, updateCustomer, type ActionState } from "../actions";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const editing = Boolean(customer);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    editing ? updateCustomer : createCustomer,
    {},
  );

  return (
    <form action={action} className="space-y-md">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField label="Nome" name="name" defaultValue={customer?.name ?? ""} required />
      <TextField label="Email" name="email" type="email" defaultValue={customer?.email ?? ""} />
      <TextField label="Telefone" name="phone" defaultValue={customer?.phone ?? ""} />
      <TextField
        label="CPF"
        name="document"
        placeholder="000.000.000-00"
        defaultValue={customer?.document ?? ""}
      />
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Notas internas
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          {editing ? "Salvar alterações" : "Salvar cliente"}
        </Button>
      </div>
    </form>
  );
}
