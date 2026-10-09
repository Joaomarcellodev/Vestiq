"use client";

import { useActionState, useState } from "react";
import { Button, Icon, TextField } from "@/components/atoms";
import { createProduct, type ActionState } from "../actions";
import { ImageUploadField } from "./image-upload-field";
import { WholesaleFields } from "./wholesale-fields";
import { CategoryField } from "./category-field";
import { emptyVariant, VariantFields, type VariantRow } from "./variant-fields";

export function ProductForm({
  categories,
  isFactory = false,
}: {
  categories: { id: string; name: string }[];
  /** Shows the wholesale conditions (minimum order + size grid) — RF-PROD-007. */
  isFactory?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProduct, {});
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);
  const [images, setImages] = useState<File[]>([]);
  const [sizeGrid, setSizeGrid] = useState<string[]>([]);

  const update = (i: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // BR-CAT-14: one row per grid size, keeping the first row's colour and prices.
  const generateFromGrid = () =>
    setVariants((rows) => {
      const base = rows[0] ?? emptyVariant;
      return sizeGrid.map((size) => ({ ...base, size, sku: "", initialStock: "0" }));
    });

  return (
    <form
      action={(fd) => {
        fd.set(
          "variants",
          JSON.stringify(
            variants.map((v) => ({
              size: v.size,
              color: v.color,
              sku: v.sku,
              costPrice: Number(v.costPrice) || 0,
              retailPrice: Number(v.retailPrice) || 0,
              initialStock: Number(v.initialStock) || 0,
            })),
          ),
        );
        fd.delete("images");
        images.forEach((f) => fd.append("images", f));
        action(fd);
      }}
      className="space-y-lg"
    >
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <h2 className="font-headline-md text-headline-md text-on-surface">Informações básicas</h2>
        <TextField
          label="Nome do produto"
          name="name"
          required
          placeholder="Ex: Jaqueta de Couro Vintage"
        />
        <TextField label="SKU (código interno)" name="internalSku" placeholder="VST-001" />
        <TextField label="Marca" name="brand" placeholder="Ex: Chanel" />
        <CategoryField categories={categories} emptyLabel="Selecione uma categoria" />
        <div>
          <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
            Descrição
          </label>
          <textarea
            name="description"
            rows={3}
            className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
            placeholder="Material, estado de conservação, detalhes..."
          />
        </div>
      </section>

      {isFactory && (
        <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Condições de atacado
          </h2>
          <WholesaleFields onSizeGridChange={setSizeGrid} />
        </section>
      )}

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <h2 className="font-headline-md text-headline-md text-on-surface">Fotos</h2>
        <ImageUploadField
          files={images}
          onFilesChange={setImages}
          hint={
            isFactory ? "Estas fotos aparecem para as revendedoras em Fornecedores." : undefined
          }
        />
      </section>

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">Variantes & estoque</h2>
          <div className="flex flex-wrap justify-end gap-2">
            {isFactory && sizeGrid.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={generateFromGrid}>
                Gerar variantes pela grade
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVariants((r) => [...r, { ...emptyVariant, size: "" }])}
            >
              <Icon name="add" size={16} />
              Adicionar
            </Button>
          </div>
        </div>

        {variants.map((v, i) => (
          <VariantFields
            key={i}
            row={v}
            onChange={(patch) => update(i, patch)}
            onRemove={
              variants.length > 1
                ? () => setVariants((r) => r.filter((_, idx) => idx !== i))
                : undefined
            }
          />
        ))}
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Salvar produto
        </Button>
      </div>
    </form>
  );
}
