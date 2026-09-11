"use client";

import { useState } from "react";
import { Badge, TextField } from "@/components/atoms";
import { formatSizeGrid, parseSizeGrid, SIZE_GRID_PRESETS } from "../wholesale";

/**
 * "Condições de atacado" — minimum order + size grid, factory only
 * (RF-PROD-007). Posts `minOrderQuantity` and `sizeGrid` (comma-separated)
 * with the surrounding form.
 */
export function WholesaleFields({
  defaultMinOrderQuantity = 1,
  defaultSizeGrid = [],
  onSizeGridChange,
}: {
  defaultMinOrderQuantity?: number;
  defaultSizeGrid?: string[];
  onSizeGridChange?: (sizes: string[]) => void;
}) {
  const [gridText, setGridText] = useState(formatSizeGrid(defaultSizeGrid));
  const sizes = parseSizeGrid(gridText);

  const change = (text: string) => {
    setGridText(text);
    onSizeGridChange?.(parseSizeGrid(text));
  };

  return (
    <div className="space-y-md">
      <TextField
        label="Pedido mínimo (peças)"
        name="minOrderQuantity"
        type="number"
        min="1"
        step="1"
        required
        defaultValue={defaultMinOrderQuantity}
        hint="Quantidade mínima de peças por pedido deste produto. Use 1 para não exigir mínimo."
      />
      <div className="space-y-sm">
        <TextField
          label="Grade de tamanhos"
          name="sizeGrid"
          value={gridText}
          onChange={(e) => change(e.target.value)}
          placeholder="Ex: P, M, G, GG"
          hint="Tamanhos disponíveis para pedido, separados por vírgula."
        />
        <div className="flex flex-wrap gap-2">
          {SIZE_GRID_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => change(formatSizeGrid(preset.sizes))}
              className="rounded-full border border-outline-variant px-3 py-1 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {sizes.length > 0 && (
          <ul aria-label="Tamanhos da grade" className="flex flex-wrap gap-1.5">
            {sizes.map((size) => (
              <li key={size}>
                <Badge tone="primary">{size}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
