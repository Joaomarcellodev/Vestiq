"use client";

import { useActionState, useState } from "react";
import { Button, Icon, TextField } from "@/components/atoms";
import { updateProduct, type ActionState } from "../actions";
import { ImageUploadField } from "./image-upload-field";
import { WholesaleFields } from "./wholesale-fields";
import { CategoryField } from "./category-field";
import { emptyVariant, VariantFields, type VariantRow } from "./variant-fields";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  cost_price: number;
  retail_price: number;
  stock_on_hand: number;
  archived_at: string | null;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  internal_sku: string | null;
  description: string | null;
  image_urls: string[];
  min_order_quantity?: number;
  size_grid?: string[];
  product_variants?: Variant[];
}

/** The product's active variants as editable rows, oldest first. */
function toRows(variants: Variant[] = []): VariantRow[] {
  return variants
    .filter((v) => v.archived_at === null)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
    .map((v) => ({
      id: v.id,
      size: v.size ?? "",
      color: v.color ?? "",
      sku: v.sku ?? "",
      costPrice: String(v.cost_price),
      retailPrice: String(v.retail_price),
      initialStock: "0",
      stock: v.stock_on_hand,
    }));
}

const variantLabel = (v: VariantRow) => [v.size, v.color].filter(Boolean).join(" · ") || "Variação";

export function EditProductForm({
  product,
  categories,
  isFactory = false,
}: {
  product: Product;
  categories: { id: string; name: string }[];
  /** Shows the wholesale conditions (minimum order + size grid) — RF-PROD-007. */
  isFactory?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProduct, {});
  const [images, setImages] = useState<File[]>([]);
  const [existing, setExisting] = useState<string[]>(product.image_urls ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(() => toRows(product.product_variants));
  // Existing variants taken off the form: archived on save, until then undoable.
  const [toArchive, setToArchive] = useState<VariantRow[]>([]);
  const errors = state.fieldErrors ?? {};

  const update = (i: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => {
    const row = variants[i];
    if (row?.id) setToArchive((rows) => [...rows, row]);
    setVariants((rows) => rows.filter((_, idx) => idx !== i));
  };

  const variantErrors = (i: number) =>
    Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith(`variants.${i}.`))
        .map(([key, message]) => [key.slice(`variants.${i}.`.length), message]),
    );

  return (
    <form
      action={(fd) => {
        fd.set("existingImages", JSON.stringify(existing));
        fd.set(
          "variants",
          JSON.stringify(
            variants.map((v) => ({
              id: v.id ?? "",
              size: v.size,
              color: v.color,
              sku: v.sku,
              costPrice: v.costPrice,
              retailPrice: v.retailPrice,
              initialStock: v.id ? "0" : v.initialStock,
            })),
          ),
        );
        fd.delete("images");
        images.forEach((f) => fd.append("images", f));
        action(fd);
      }}
      className="space-y-md"
    >
      <input type="hidden" name="id" value={product.id} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField
        label="Nome do produto"
        name="name"
        defaultValue={product.name}
        required
        error={errors.name}
      />
      <TextField
        label="SKU (código interno)"
        name="internalSku"
        defaultValue={product.internal_sku ?? ""}
      />
      <TextField label="Marca" name="brand" defaultValue={product.brand ?? ""} />
      <CategoryField
        categories={categories}
        emptyLabel="Sem categoria"
        defaultValue={product.category_id ?? ""}
      />
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Descrição
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={product.description ?? ""}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        />
      </div>
      {isFactory && (
        <WholesaleFields
          defaultMinOrderQuantity={product.min_order_quantity ?? 1}
          defaultSizeGrid={product.size_grid ?? []}
        />
      )}
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Fotos
        </label>
        <ImageUploadField
          files={images}
          onFilesChange={setImages}
          existing={existing}
          onExistingChange={setExisting}
          hint={
            isFactory ? "Estas fotos aparecem para as revendedoras em Fornecedores." : undefined
          }
        />
      </div>
      <section className="space-y-md">
        <div className="flex items-center justify-between">
          <h2 className="font-title-lg text-title-lg text-on-surface">Variantes</h2>
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
        {variants.map((v, i) => (
          <VariantFields
            key={v.id ?? `new-${i}`}
            row={v}
            onChange={(patch) => update(i, patch)}
            onRemove={variants.length > 1 ? () => remove(i) : undefined}
            removeLabel={v.id ? "Arquivar" : "Remover"}
            errors={variantErrors(i)}
          />
        ))}
        {errors.variants && (
          <p className="font-body-md text-body-md text-error">{errors.variants}</p>
        )}
        {toArchive.length > 0 && (
          <ul className="space-y-2 rounded-lg bg-surface-container px-4 py-3">
            {toArchive.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 font-body-md text-body-md text-on-surface-variant"
              >
                <span>
                  {variantLabel(v)} será arquivada ao salvar
                  {v.stock ? ` (${v.stock} peça(s) em estoque)` : ""}.
                </span>
                <button
                  type="button"
                  className="shrink-0 font-semibold text-primary-container"
                  onClick={() => {
                    setToArchive((rows) => rows.filter((r) => r.id !== v.id));
                    setVariants((rows) => [...rows, v]);
                  }}
                >
                  Desfazer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
