import Link from "next/link";
import Image from "next/image";
import { Badge, Icon } from "@/components/atoms";
import { minOrderLabel } from "@/features/catalog/wholesale";
import { priceRangeLabel } from "../format";
import type { SupplierProductListItem } from "../queries";

/** Result card of the supplier product search (SPEC-011 RF-SUP-002). */
export function SupplierProductCard({
  product,
  showSupplier = true,
}: {
  product: SupplierProductListItem;
  showSupplier?: boolean;
}) {
  const subtitle = [showSupplier && product.supplierName, product.brand, product.categoryName]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/fornecedores/produtos/${product.id}`}
      className="flex h-full gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface transition-colors hover:bg-surface-container-low"
    >
      <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container text-outline">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon name="inventory_2" size={24} />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <p className="truncate font-title-lg text-title-lg text-on-surface">{product.name}</p>
          {subtitle && (
            <p className="mt-0.5 truncate font-body-md text-body-md text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
        <p className="font-title-lg text-title-lg text-primary-container">
          {priceRangeLabel(product.minPrice, product.maxPrice)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={product.inStock ? "success" : "neutral"}>
            {product.inStock ? "Em estoque" : "Sem estoque"}
          </Badge>
          <Badge>{minOrderLabel(product.minOrderQuantity)}</Badge>
          {product.sizeGrid.length > 0 && <Badge>{product.sizeGrid.join(" · ")}</Badge>}
        </div>
      </div>
    </Link>
  );
}
