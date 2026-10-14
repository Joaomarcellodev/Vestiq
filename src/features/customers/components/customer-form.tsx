"use client";

import { useState } from "react";
import { Button, TextField } from "@/components/atoms";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { formatCPF } from "@/lib/utils/cpf";
import { formatPhone } from "@/lib/utils/phone";
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
  const { state, pending, formProps } = useFormSubmit<ActionState>(
    editing ? updateCustomer : createCustomer,
    {},
  );
  const errors = state.fieldErrors ?? {};
  // VES-80 — masked while typing; the action stores the digits.
  const [phone, setPhone] = useState(formatPhone(customer?.phone ?? ""));
  const [cpf, setCpf] = useState(formatCPF(customer?.document ?? ""));

  return (
    <form {...formProps} className="space-y-md">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField
        label="Nome"
        name="name"
        defaultValue={customer?.name ?? ""}
        required
        error={errors.name}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        defaultValue={customer?.email ?? ""}
        error={errors.email}
      />
      <TextField
        label="Telefone"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="(00) 00000-0000"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, "")))}
        error={errors.phone}
      />
      <TextField
        label="CPF"
        name="document"
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => setCpf(formatCPF(e.target.value))}
        error={errors.document}
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
