import Image from "next/image";
import { Icon } from "@/components/atoms";
import type { NegotiationProduct } from "../queries";

/** Photo (or placeholder), name and "brand · variant" of the negotiated product (VES-97). */
export function NegotiationProductSummary({
  product,
  size = 48,
  children,
}: {
  product: NegotiationProduct | null;
  size?: number;
  /** Extra lines under the product, e.g. counterparty and quantity. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container text-outline"
        style={{ width: size, height: size }}
      >
        {product?.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon name="inventory_2" size={Math.round(size / 2.5)} />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-body-md text-body-md text-on-surface">
          {product?.name ?? "Produto indisponível"}
        </p>
        {product && (
          <p className="truncate font-body-md text-body-md text-on-surface-variant">
            {[product.brand, product.variant].filter(Boolean).join(" · ")}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
