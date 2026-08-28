"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/atoms";
import { createNetwork, inviteReseller, type ActionState } from "../actions";

export function CreateNetworkForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createNetwork, {});
  return (
    <form action={action} className="flex gap-2">
      <TextField label="Nome da nova rede" name="name" required />
      <div className="flex items-end">
        <Button type="submit" loading={pending}>
          Criar
        </Button>
      </div>
      {state.error && <p className="font-body-md text-body-md text-error">{state.error}</p>}
    </form>
  );
}

export function InviteResellerForm({ networks }: { networks: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteReseller, {});
  return (
    <form action={action} className="space-y-sm rounded-xl border border-outline-variant p-lg">
      <h3 className="font-title-lg text-title-lg text-on-surface">Convidar revendedora</h3>
      {state.error && <p className="font-body-md text-body-md text-error">{state.error}</p>}
      {state.ok && (
        <p className="font-body-md text-body-md text-on-success-container">Convite enviado.</p>
      )}
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Rede
        </label>
        <select
          name="networkId"
          required
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        >
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Email da revendedora" name="email" type="email" required />
      <Button type="submit" loading={pending}>
        Enviar convite
      </Button>
    </form>
  );
}
