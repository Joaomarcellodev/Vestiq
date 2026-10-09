"use client";

import { useEffect, useRef, useState } from "react";
import { Button, TextField } from "@/components/atoms";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { adjustStock, recordEntry, type ActionState } from "../actions";

export function StockControls({ variantId }: { variantId: string }) {
  const [mode, setMode] = useState<"entry" | "adjust" | null>(null);
  const entry = useFormSubmit<ActionState>(recordEntry, {});
  const adjust = useFormSubmit<ActionState>(adjustStock, {});
  const entryState = entry.state;
  const adjustState = adjust.state;
  const entryForm = useRef<HTMLFormElement>(null);
  const adjustForm = useRef<HTMLFormElement>(null);

  // Fields survive a failed submission (VES-77); a recorded one clears them.
  useEffect(() => {
    if (entryState.ok) entryForm.current?.reset();
  }, [entryState]);
  useEffect(() => {
    if (adjustState.ok) adjustForm.current?.reset();
  }, [adjustState]);

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
        ref={entryForm}
        {...entry.formProps}
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
          <Button type="submit" size="sm" loading={entry.pending}>
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
    <form
      ref={adjustForm}
      {...adjust.formProps}
      className="space-y-sm rounded-lg border border-outline-variant p-3"
    >
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
        <Button type="submit" size="sm" loading={adjust.pending}>
          Aplicar ajuste
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>
          Fechar
        </Button>
      </div>
    </form>
  );
}
