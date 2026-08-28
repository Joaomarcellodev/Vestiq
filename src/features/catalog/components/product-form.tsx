"use client";

import { useActionState, useState } from "react";
import { Button, Icon, TextField } from "@/components/atoms";
import { estimatedMargin, formatPercent } from "@/lib/utils/currency";
import { createProduct, type ActionState } from "../actions";

interface VariantRow {
  size: string;
  color: string;
  sku: string;
  costPrice: string;
  retailPrice: string;
  initialStock: string;
}

const emptyVariant: VariantRow = {
  size: "Único",
  color: "",
  sku: "",
  costPrice: "",
  retailPrice: "",
  initialStock: "0",
};

export function ProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProduct, {});
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);

  const update = (i: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

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
        <div>
          <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
            Categoria
          </label>
          <select
            name="categoryId"
            className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
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

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">Variantes & estoque</h2>
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

        {variants.map((v, i) => {
          const margin = estimatedMargin(Number(v.costPrice) || 0, Number(v.retailPrice) || 0);
          return (
            <div key={i} className="space-y-sm rounded-lg border border-outline-variant p-4">
              <div className="grid grid-cols-2 gap-sm">
                <TextField
                  label="Tamanho"
                  value={v.size}
                  onChange={(e) => update(i, { size: e.target.value })}
                />
                <TextField
                  label="Cor"
                  value={v.color}
                  onChange={(e) => update(i, { color: e.target.value })}
                />
                <TextField
                  label="SKU variante"
                  value={v.sku}
                  onChange={(e) => update(i, { sku: e.target.value })}
                />
                <TextField
                  label="Estoque inicial"
                  type="number"
                  value={v.initialStock}
                  onChange={(e) => update(i, { initialStock: e.target.value })}
                />
                <TextField
                  label="Custo (R$)"
                  type="number"
                  step="0.01"
                  value={v.costPrice}
                  onChange={(e) => update(i, { costPrice: e.target.value })}
                />
                <TextField
                  label="Preço de venda (R$)"
                  type="number"
                  step="0.01"
                  value={v.retailPrice}
                  onChange={(e) => update(i, { retailPrice: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between font-label-md text-label-md text-on-surface-variant">
                <span>
                  Margem estimada:{" "}
                  <strong className="text-primary-container">{formatPercent(margin)}</strong>
                </span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    className="text-error"
                    onClick={() => setVariants((r) => r.filter((_, idx) => idx !== i))}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex gap-2">
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Salvar produto
        </Button>
      </div>
    </form>
  );
}
