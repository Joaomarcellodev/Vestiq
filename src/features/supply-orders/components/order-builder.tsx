"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Badge, Button, Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { formatBRL } from "@/lib/utils/currency";
import { minOrderLabel } from "@/features/catalog/wholesale";
import { placeSupplyOrder, type ActionState } from "../actions";
import {
  parseQuantity,
  summarizeOrder,
  toOrderItems,
  variantAt,
  type OrderCatalogProduct,
  type Quantities,
} from "../order-math";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function priceLabel(product: OrderCatalogProduct): string {
  const prices = product.variants.map((v) => v.price).filter((p) => p > 0);
  if (prices.length === 0) return "Preço sob consulta";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
}

/**
 * Supply order form (SPEC-012 RF-ORD-001/002): one colour × size grid per
 * product, the running minimum-order check and the order summary.
 */
export function OrderBuilder({
  supplierId,
  catalog,
  focusProductId,
}: {
  supplierId: string;
  catalog: OrderCatalogProduct[];
  focusProductId?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(placeSupplyOrder, {});
  const [quantities, setQuantities] = useState<Quantities>({});
  const [filter, setFilter] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Quantities typed before hydration live only in the DOM — adopt them once
  // React takes over, so the summary and the payload match what's on screen.
  useEffect(() => {
    const typed: Quantities = {};
    formRef.current
      ?.querySelectorAll<HTMLInputElement>("input[data-variant-id]")
      .forEach((input) => {
        const q = parseQuantity(input.value);
        if (q > 0) typed[input.dataset.variantId!] = q;
      });
    // One-off sync from the DOM (an external system here) — runs once, on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Object.keys(typed).length > 0) setQuantities((prev) => ({ ...typed, ...prev }));
  }, []);

  const summary = useMemo(() => summarizeOrder(catalog, quantities), [catalog, quantities]);
  const byProduct = new Map(summary.products.map((p) => [p.productId, p]));

  const products = useMemo(() => {
    const term = normalize(filter.trim());
    const visible = term
      ? catalog.filter((p) =>
          normalize([p.name, p.brand, ...p.colors].filter(Boolean).join(" ")).includes(term),
        )
      : catalog;
    return focusProductId
      ? [...visible].sort(
          (a, b) => Number(b.id === focusProductId) - Number(a.id === focusProductId),
        )
      : visible;
  }, [catalog, filter, focusProductId]);

  const setQuantity = (variantId: string, raw: string) =>
    setQuantities((prev) => ({ ...prev, [variantId]: parseQuantity(raw) }));

  if (catalog.length === 0) {
    return (
      <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
        Este fornecedor ainda não tem produtos disponíveis para pedido.
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-lg">
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="items" value={JSON.stringify(toOrderItems(quantities))} />

      <label className="relative block sm:w-80">
        <span className="sr-only">Filtrar produtos</span>
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar produtos..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-md text-body-md"
        />
      </label>

      {products.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Nenhum produto encontrado.
        </p>
      )}

      <ul className="space-y-md">
        {products.map((product) => {
          const line = byProduct.get(product.id);
          return (
            <li
              key={product.id}
              id={`produto-${product.id}`}
              className={cn(
                "space-y-md rounded-xl border bg-surface-container-lowest p-4 shadow-surface",
                product.id === focusProductId
                  ? "border-primary-container"
                  : "border-outline-variant",
              )}
            >
              <div className="flex gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container text-outline">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon name="inventory_2" size={22} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-title-lg text-title-lg text-on-surface">{product.name}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {priceLabel(product)} · {minOrderLabel(product.minOrderQuantity)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-left">
                  <caption className="sr-only">
                    Quantidades de {product.name} por cor e tamanho
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="font-label-sm text-label-sm text-on-surface-variant"
                      >
                        Cor
                      </th>
                      {product.sizes.map((size) => (
                        <th
                          key={size}
                          scope="col"
                          className="min-w-16 text-center font-label-sm text-label-sm text-on-surface-variant"
                        >
                          {size}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.colors.map((color) => (
                      <tr key={color}>
                        <th
                          scope="row"
                          className="whitespace-nowrap pr-2 font-body-md text-body-md font-semibold text-on-surface"
                        >
                          {color}
                        </th>
                        {product.sizes.map((size) => {
                          const variant = variantAt(product, color, size);
                          if (!variant) {
                            return (
                              <td key={size} className="text-center text-outline" aria-hidden>
                                —
                              </td>
                            );
                          }
                          const q = quantities[variant.id] ?? 0;
                          return (
                            <td key={size}>
                              <input
                                type="number"
                                data-variant-id={variant.id}
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={q === 0 ? "" : q}
                                onChange={(e) => setQuantity(variant.id, e.target.value)}
                                placeholder="0"
                                aria-label={`${product.name} ${color} ${size}`}
                                title={
                                  variant.inStock
                                    ? `${formatBRL(variant.price)} · em estoque`
                                    : `${formatBRL(variant.price)} · sob encomenda`
                                }
                                className={cn(
                                  "field-focus-ring w-full min-w-14 rounded-md border bg-surface-container-lowest px-2 py-2 text-center font-body-md text-body-md",
                                  variant.inStock
                                    ? "border-outline-variant"
                                    : "border-dashed border-outline",
                                  q > 0 && "border-primary-container bg-primary-fixed/40",
                                )}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {line ? (
                    <>
                      {line.pieces} peça{line.pieces === 1 ? "" : "s"} · {formatBRL(line.amount)}
                    </>
                  ) : (
                    "Nenhuma peça"
                  )}
                </p>
                {line &&
                  (line.shortfall > 0 ? (
                    <Badge tone="warning">
                      Faltam {line.shortfall} peça{line.shortfall === 1 ? "" : "s"} para o mínimo
                    </Badge>
                  ) : (
                    <Badge tone="success">Mínimo atingido</Badge>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="font-body-md text-body-md text-on-surface-variant">
        Campos tracejados são variações sem estoque no momento. O fornecedor produz sob encomenda e
        confirma ao responder o pedido.
      </p>

      <div>
        <label
          htmlFor="order-note"
          className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
        >
          Observação para o fornecedor (opcional)
        </label>
        <textarea
          id="order-note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Prazo, forma de entrega, combinação de cores..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
      </div>

      <div className="sticky bottom-20 z-10 space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-surface sm:p-4 lg:bottom-4">
        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
          >
            {state.error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div aria-live="polite" className="min-w-0">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {summary.totalPieces} peça{summary.totalPieces === 1 ? "" : "s"}
              {summary.products.length > 0 &&
                ` · ${summary.products.length} produto${summary.products.length === 1 ? "" : "s"}`}
            </p>
            <p className="font-title-lg text-title-lg text-primary-container sm:font-headline-md sm:text-headline-md">
              {formatBRL(summary.totalAmount)}
            </p>
            {summary.blockers.length > 0 && summary.totalPieces > 0 && (
              <p className="line-clamp-2 font-label-sm text-label-sm text-on-surface-variant">
                {summary.blockers[0]}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="md"
            className="shrink-0 sm:h-12 sm:px-10"
            disabled={pending || summary.blockers.length > 0}
          >
            {pending ? "Enviando..." : "Enviar pedido"}
          </Button>
        </div>
      </div>
    </form>
  );
}
