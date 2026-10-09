"use client";

import { TextField } from "@/components/atoms";
import { estimatedMargin, formatPercent } from "@/lib/utils/currency";

/** One variant row of the product forms — text values as typed. */
export interface VariantRow {
  /** Set for a variant that already exists (edit form). */
  id?: string;
  size: string;
  color: string;
  sku: string;
  costPrice: string;
  retailPrice: string;
  initialStock: string;
  /** Current balance of an existing variant — shown, never edited (ADR-0005). */
  stock?: number;
}

export const emptyVariant: VariantRow = {
  size: "Único",
  color: "",
  sku: "",
  costPrice: "",
  retailPrice: "",
  initialStock: "0",
};

/** Colour, size, SKU, prices and — for a new variant — the initial stock. */
export function VariantFields({
  row,
  onChange,
  onRemove,
  removeLabel = "Remover",
  errors = {},
}: {
  row: VariantRow;
  onChange: (patch: Partial<VariantRow>) => void;
  /** Omitted when the row can't be removed (the product's last variant). */
  onRemove?: () => void;
  removeLabel?: string;
  /** Messages keyed by field name ("retailPrice"). */
  errors?: Partial<Record<keyof VariantRow, string>>;
}) {
  const margin = estimatedMargin(Number(row.costPrice) || 0, Number(row.retailPrice) || 0);
  const existing = Boolean(row.id);

  return (
    <div className="space-y-sm rounded-lg border border-outline-variant p-4">
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <TextField
          label="Tamanho"
          value={row.size}
          onChange={(e) => onChange({ size: e.target.value })}
          error={errors.size}
        />
        <TextField
          label="Cor"
          value={row.color}
          onChange={(e) => onChange({ color: e.target.value })}
          error={errors.color}
        />
        <TextField
          label="SKU variante"
          value={row.sku}
          onChange={(e) => onChange({ sku: e.target.value })}
          error={errors.sku}
        />
        {existing ? (
          <div>
            <p className="mb-1.5 font-body-md text-body-md font-semibold text-on-surface">
              Estoque atual
            </p>
            <p className="py-3 font-body-md text-body-md text-on-surface">
              {row.stock ?? 0} peça(s){" "}
              <span className="text-on-surface-variant">— altere pelo inventário</span>
            </p>
          </div>
        ) : (
          <TextField
            label="Estoque inicial"
            type="number"
            value={row.initialStock}
            onChange={(e) => onChange({ initialStock: e.target.value })}
            error={errors.initialStock}
          />
        )}
        <TextField
          label="Custo (R$)"
          type="number"
          step="0.01"
          value={row.costPrice}
          onChange={(e) => onChange({ costPrice: e.target.value })}
          error={errors.costPrice}
        />
        <TextField
          label="Preço de venda (R$)"
          type="number"
          step="0.01"
          value={row.retailPrice}
          onChange={(e) => onChange({ retailPrice: e.target.value })}
          error={errors.retailPrice}
        />
      </div>
      <div className="flex items-center justify-between font-label-md text-label-md text-on-surface-variant">
        <span>
          Margem estimada:{" "}
          <strong className="text-primary-container">{formatPercent(margin)}</strong>
        </span>
        {onRemove && (
          <button type="button" className="text-error" onClick={onRemove}>
            {removeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
