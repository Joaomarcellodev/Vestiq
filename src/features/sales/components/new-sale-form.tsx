"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import type { CatalogProduct } from "../queries";
import { computeTotals, validateDiscount } from "../totals";
import { confirmSale, type SaleActionState } from "../actions";

interface VariantOption {
  id: string;
  label: string;
  price: number;
  stock: number;
}
interface CartLine {
  variantId: string;
  label: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export function NewSaleForm({
  variants,
  catalog,
  customers,
}: {
  variants: VariantOption[];
  catalog: CatalogProduct[];
  customers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<SaleActionState, FormData>(confirmSale, {});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState("0");
  const [payment, setPayment] = useState<"PIX" | "CARTAO" | "DINHEIRO">("PIX");
  const [customerId, setCustomerId] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return variants.filter((v) => v.label.toLowerCase().includes(q)).slice(0, 6);
  }, [search, variants]);

  const catalogResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(q));
  }, [search, catalog]);

  const totals = useMemo(
    () =>
      computeTotals(
        cart.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
        Number(discount) || 0,
      ),
    [cart, discount],
  );
  const discountError = validateDiscount(totals.subtotal, Number(discount) || 0);

  const addItem = (item: { id: string; label: string; price: number; stock: number }) => {
    setCart((c) => {
      const existing = c.find((l) => l.variantId === item.id);
      if (existing) {
        return c.map((l) =>
          l.variantId === item.id ? { ...l, quantity: Math.min(l.quantity + 1, l.stock) } : l,
        );
      }
      return [
        ...c,
        {
          variantId: item.id,
          label: item.label,
          unitPrice: item.price,
          quantity: 1,
          stock: item.stock,
        },
      ];
    });
  };

  const addLine = (v: VariantOption) => {
    setSearch("");
    addItem(v);
  };

  const cartQty = (variantId: string) => cart.find((l) => l.variantId === variantId)?.quantity ?? 0;

  return (
    <form
      action={(fd) => {
        fd.set("customerId", customerId);
        fd.set("paymentMethod", payment);
        fd.set("discount", String(Number(discount) || 0));
        fd.set(
          "items",
          JSON.stringify(
            cart.map((l) => ({
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
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

      <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Cliente
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        >
          <option value="">Venda avulsa</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <label className="block font-body-md text-body-md font-semibold text-on-surface">
          Produtos
        </label>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto no estoque..."
            className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-overlay">
              {results.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => addLine(v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left font-body-md text-body-md hover:bg-surface-container-low"
                  >
                    <span>{v.label}</span>
                    <span className="text-on-surface-variant">
                      {formatBRL(v.price)} · {v.stock} un.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Visual catalog — tap a card to add it to the sale */}
        {catalogResults.length === 0 ? (
          <p className="py-2 font-body-md text-body-md text-on-surface-variant">
            {search ? "Nenhum produto encontrado." : "Nenhum produto com estoque disponível."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {catalogResults.map((p) => (
              <CatalogCard key={p.id} product={p} onAdd={addItem} inCart={cartQty} />
            ))}
          </div>
        )}

        <div className="border-t border-outline-variant pt-sm font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Itens da venda
        </div>
        {cart.length === 0 ? (
          <p className="py-4 text-center font-body-md text-body-md text-on-surface-variant">
            Nenhum item adicionado.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {cart.map((l) => (
              <li key={l.variantId} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-body-md text-body-md text-on-surface">{l.label}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {formatBRL(l.unitPrice)}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={l.stock}
                  value={l.quantity}
                  onChange={(e) =>
                    setCart((c) =>
                      c.map((x) =>
                        x.variantId === l.variantId
                          ? {
                              ...x,
                              quantity: Math.max(1, Math.min(Number(e.target.value) || 1, x.stock)),
                            }
                          : x,
                      ),
                    )
                  }
                  className="w-16 rounded-lg border border-outline-variant px-2 py-1 text-center font-body-md text-body-md"
                />
                <button
                  type="button"
                  onClick={() => setCart((c) => c.filter((x) => x.variantId !== l.variantId))}
                  className="text-error"
                  aria-label="Remover item"
                >
                  <Icon name="delete" size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Método de pagamento
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["PIX", "CARTAO", "DINHEIRO"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPayment(m)}
              className={`rounded-lg border px-3 py-3 font-label-md text-label-md ${
                payment === m
                  ? "border-primary-container bg-primary-fixed text-on-primary-fixed-variant"
                  : "border-outline-variant text-on-surface-variant"
              }`}
            >
              {m === "CARTAO" ? "Cartão" : m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center justify-between font-body-md text-body-md">
          <span className="text-on-surface-variant">Subtotal</span>
          <span className="text-on-surface">{formatBRL(totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-body-md text-body-md text-on-surface-variant">Desconto (R$)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-32 rounded-lg border border-outline-variant px-3 py-2 text-right font-body-md text-body-md"
          />
        </div>
        {discountError && <p className="font-body-md text-body-md text-error">{discountError}</p>}
        <div className="flex items-center justify-between border-t border-outline-variant pt-sm font-title-lg text-title-lg">
          <span className="text-on-surface">Total</span>
          <span className="text-primary-container">{formatBRL(totals.total)}</span>
        </div>
      </section>

      <div className="sticky bottom-24 z-10 lg:static lg:bottom-auto">
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending}
          disabled={cart.length === 0 || !!discountError}
          className="shadow-overlay lg:shadow-primary"
        >
          <Icon name="check_circle" size={20} />
          Confirmar venda
        </Button>
      </div>
    </form>
  );
}

function CatalogCard({
  product,
  onAdd,
  inCart,
}: {
  product: CatalogProduct;
  onAdd: (item: { id: string; label: string; price: number; stock: number }) => void;
  inCart: (variantId: string) => number;
}) {
  const [open, setOpen] = useState(false);
  const only = product.variants.length === 1 ? product.variants[0] : undefined;
  const single = Boolean(only);
  const qtyInCart = product.variants.reduce((n, v) => n + inCart(v.id), 0);

  const add = (v: CatalogProduct["variants"][number]) =>
    onAdd({
      id: v.id,
      label: single ? product.name : `${product.name} · ${v.label}`,
      price: v.price,
      stock: v.stock,
    });

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <button
        type="button"
        aria-label={only ? `Adicionar ${product.name}` : `${product.name} — escolher variante`}
        onClick={() => (only ? add(only) : setOpen((o) => !o))}
        className="group relative aspect-square w-full bg-surface-container text-outline"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 640px) 200px, 45vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Icon name="inventory_2" size={28} />
          </span>
        )}
        <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary-container text-on-primary shadow-primary">
          {qtyInCart > 0 ? (
            <span className="font-label-md text-label-md">{qtyInCart}</span>
          ) : (
            <Icon name="add" size={16} />
          )}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
          {product.name}
        </p>
        <p className="truncate font-label-md text-label-md text-on-surface-variant">
          {product.brand ?? "—"}
        </p>
        <p className="mt-0.5 font-body-md text-body-md text-primary-container">
          {formatBRL(product.minPrice)}
          {!single && (
            <span className="text-on-surface-variant"> · {product.variants.length} var.</span>
          )}
        </p>

        {open && !single && (
          <ul className="mt-1.5 space-y-1">
            {product.variants.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => add(v)}
                  className="flex w-full items-center justify-between rounded-md border border-outline-variant px-2 py-1.5 text-left font-label-md text-label-md hover:bg-surface-container-low"
                >
                  <span className="truncate">{v.label}</span>
                  <span className="shrink-0 text-on-surface-variant">
                    {formatBRL(v.price)}
                    {inCart(v.id) > 0 && ` · ${inCart(v.id)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
