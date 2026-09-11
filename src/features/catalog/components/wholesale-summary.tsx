import { Badge } from "@/components/atoms";
import { minOrderLabel } from "../wholesale";

/** Read-only "Condições de atacado" card for the product detail (RF-PROD-007). */
export function WholesaleSummary({
  minOrderQuantity,
  sizeGrid,
}: {
  minOrderQuantity: number;
  sizeGrid: string[];
}) {
  return (
    <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface">
      <h2 className="font-title-lg text-title-lg text-on-surface">Condições de atacado</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">
        {minOrderLabel(minOrderQuantity)}
      </p>
      {sizeGrid.length > 0 ? (
        <ul aria-label="Grade de tamanhos" className="flex flex-wrap gap-1.5">
          {sizeGrid.map((size) => (
            <li key={size}>
              <Badge tone="primary">{size}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Grade de tamanhos não definida.
        </p>
      )}
    </section>
  );
}
