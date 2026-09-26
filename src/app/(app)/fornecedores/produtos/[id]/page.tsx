import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupplierProduct } from "@/features/suppliers/queries";
import { priceRangeLabel, variantLabel } from "@/features/suppliers/format";
import { WholesaleSummary } from "@/features/catalog/components/wholesale-summary";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Produto do fornecedor" };

export default async function SupplierProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getSupplierProduct(id);
  if (!product) notFound();

  const prices = product.variants.map((v) => v.price).filter((n) => n > 0);
  const priceLabel = prices.length
    ? priceRangeLabel(Math.min(...prices), Math.max(...prices))
    : priceRangeLabel(null, null);

  return (
    <div className="space-y-lg">
      <BackButton fallback="/fornecedores" label="Fornecedores" />
      <PageHeader
        title={product.name}
        description={[product.brand, product.categoryName].filter(Boolean).join(" · ")}
        action={
          <Link href={`/fornecedores/${product.supplierId}`}>
            <Button variant="secondary" size="sm">
              <Icon name="factory" size={16} />
              {product.supplierName}
            </Button>
          </Link>
        }
      />

      {product.imageUrls.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {product.imageUrls.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container"
            >
              <Image
                src={url}
                alt={`${product.name} — foto ${i + 1}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <p className="font-headline-md text-headline-md text-primary-container">{priceLabel}</p>

      {product.description && (
        <p className="font-body-md text-body-md text-on-surface-variant">{product.description}</p>
      )}

      <WholesaleSummary minOrderQuantity={product.minOrderQuantity} sizeGrid={product.sizeGrid} />

      <section className="space-y-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">Variações</h2>
        {product.variants.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nenhuma variação disponível.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest shadow-surface">
            {product.variants.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-title-lg text-title-lg text-on-surface">
                    {variantLabel(v.color, v.size)}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {v.sku ? `SKU ${v.sku} · ` : ""}
                    {v.price > 0 ? formatBRL(v.price) : "Preço sob consulta"}
                  </p>
                </div>
                <Badge tone={v.inStock ? "success" : "neutral"}>
                  {v.inStock ? "Em estoque" : "Sem estoque"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
