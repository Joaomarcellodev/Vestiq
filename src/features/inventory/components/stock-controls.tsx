"use client";

import { useActionState, useState } from "react";
import { Button, TextField } from "@/components/atoms";
import { adjustStock, recordEntry, type ActionState } from "../actions";

export function StockControls({ variantId }: { variantId: string }) {
  const [mode, setMode] = useState<"entry" | "adjust" | null>(null);
  const [entryState, entryAction, entryPending] = useActionState<ActionState, FormData>(
    recordEntry,
    {},
  );
  const [adjustState, adjustAction, adjustPending] = useActionState<ActionState, FormData>(
    adjustStock,
    {},
  );

  if (mode === null) {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setMode("entry")}>
          Entrada
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMode("adjust")}>
          Ajuste
        </Button>
      </div>
    );
  }

  if (mode === "entry") {
    return (
      <form
        action={entryAction}
        className="space-y-sm rounded-lg border border-outline-variant p-3"
      >
        <input type="hidden" name="variantId" value={variantId} />
        {entryState.error && (
          <p className="font-body-md text-body-md text-error">{entryState.error}</p>
        )}
        {entryState.ok && (
          <p className="font-body-md text-body-md text-on-success-container">Entrada registrada.</p>
        )}
        <TextField label="Quantidade" name="quantity" type="number" min="1" required />
        <TextField label="Observação" name="note" placeholder="Ex: compra de janeiro" />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={entryPending}>
            Registrar entrada
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>
            Fechar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={adjustAction} className="space-y-sm rounded-lg border border-outline-variant p-3">
      <input type="hidden" name="variantId" value={variantId} />
      {adjustState.error && (
        <p className="font-body-md text-body-md text-error">{adjustState.error}</p>
      )}
      {adjustState.ok && (
        <p className="font-body-md text-body-md text-on-success-container">Ajuste registrado.</p>
      )}
      <TextField label="Ajuste (+/-)" name="delta" type="number" required placeholder="-1" />
      <TextField
        label="Motivo"
        name="note"
        required
        placeholder="Ex: perda, correção de contagem"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={adjustPending}>
          Aplicar ajuste
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>
          Fechar
        </Button>
      </div>
    </form>
  );
}
