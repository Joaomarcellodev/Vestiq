"use client";

import Link from "next/link";
import { Button, TextField } from "@/components/atoms";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { updateOffer, type UpdateOfferState } from "../actions";

/** VES-89 — the owner changes the price, quantity and note of an open offer. */
export function EditOfferForm({
  offer,
}: {
  offer: {
    id: string;
    remaining: number;
    price: number;
    note: string | null;
    maxQuantity: number;
    negotiationInProgress: boolean;
  };
}) {
  const { state, pending, formProps } = useFormSubmit<UpdateOfferState>(updateOffer, {});
  const errors = state.fieldErrors ?? {};

  if (offer.negotiationInProgress) {
    return (
      <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
        Esta oferta tem uma negociação em andamento. Responda ou conclua a negociação antes de
        editar — a proposta foi feita sobre o preço e a quantidade atuais.
      </p>
    );
  }

  return (
    <form {...formProps} className="space-y-md">
      <input type="hidden" name="offerId" value={offer.id} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField
        label="Quantidade disponível"
        name="quantity"
        type="number"
        min={1}
        max={offer.maxQuantity}
        step={1}
        required
        defaultValue={offer.remaining}
        hint={`Até ${offer.maxQuantity} — o estoque livre desta variação.`}
        error={errors.quantity}
      />
      <TextField
        label="Preço de transferência (R$)"
        name="transferPrice"
        type="number"
        min={0}
        step="0.01"
        required
        defaultValue={offer.price}
        error={errors.transferPrice}
      />
      <TextField
        label="Observação"
        name="note"
        placeholder="Estado da peça, condições..."
        defaultValue={offer.note ?? ""}
        error={errors.note}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/rede/ofertas/${offer.id}`}>
          <Button type="button" variant="ghost" className="w-full sm:w-auto">
            Voltar sem salvar
          </Button>
        </Link>
        <Button type="submit" loading={pending} className="w-full sm:w-auto sm:px-10">
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
