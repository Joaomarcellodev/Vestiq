import Link from "next/link";
import { Icon } from "@/components/atoms";
import type { SupplierListItem } from "../queries";

/** Supplier row of the supplier search (SPEC-011 RF-SUP-001). */
export function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
  return (
    <Link
      href={`/fornecedores/${supplier.id}`}
      className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface transition-colors hover:bg-surface-container-low"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary-container">
        <Icon name="factory" size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-title-lg text-title-lg text-on-surface">{supplier.name}</p>
        <p className="truncate font-body-md text-body-md text-on-surface-variant">
          {supplier.productCount} produto{supplier.productCount === 1 ? "" : "s"}
          {supplier.networkNames.length > 0 && ` · ${supplier.networkNames.join(", ")}`}
        </p>
      </div>
      <Icon name="chevron_right" size={20} className="shrink-0 text-outline" />
    </Link>
  );
}
