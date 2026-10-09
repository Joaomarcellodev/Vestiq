"use client";

import { useActionState, useState } from "react";
import { Button, TextField } from "@/components/atoms";
import { ImageUploadField } from "@/features/catalog/components/image-upload-field";
import { publishOffer, type ActionState } from "../actions";

export function PublishOfferForm({
  variants,
  networks,
}: {
  variants: { id: string; label: string }[];
  networks: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishOffer, {});
  const [images, setImages] = useState<File[]>([]);

  if (variants.length === 0) {
    return (
      <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
        Você não tem variações com estoque disponível para ofertar.
      </p>
    );
  }
  if (networks.length === 0) {
    return (
      <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
        Você ainda não pertence a nenhuma rede.
      </p>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.delete("images");
        images.forEach((f) => fd.append("images", f));
        action(fd);
      }}
      className="space-y-md"
    >
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Produto / variação
        </label>
        <select
          name="variantId"
          required
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
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
      <TextField label="Quantidade ofertada" name="quantity" type="number" min="1" required />
      <TextField
        label="Preço de transferência (R$)"
        name="transferPrice"
        type="number"
        step="0.01"
        required
      />
      <TextField label="Observação" name="note" placeholder="Estado da peça, condições..." />
      <div>
        <p className="mb-1.5 font-body-md text-body-md font-semibold text-on-surface">
          Fotos da peça (opcional)
        </p>
        <ImageUploadField
          files={images}
          onFilesChange={setImages}
          hint="Mostre a peça real: estado, detalhes, etiqueta. Sem fotos, a oferta usa as do produto."
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Publicar na rede
        </Button>
      </div>
    </form>
  );
}
