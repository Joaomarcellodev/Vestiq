"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { archiveProductToOffers, type ActionState } from "../actions";
import type { ArchiveOption } from "../queries";

const fieldClass =
  "field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md";

type Row = { quantity: string; price: string };

/** Stock not held by an open offer — the most a new offer can take. */
const free = (v: ArchiveOption) => Math.max(v.stock - v.onNetwork, 0);

/**
 * AC-PROD-006-03/04 — archive step. Each variant comes prefilled with its free
 * stock (what isn't in an open offer yet) at cost price; quantity 0 keeps that
 * variant out of the network. Offers published earlier stay on the network
 * (VES-98). Without a network or free stock, confirming only archives.
 */
export function ArchiveToOffersForm({
  productId,
  variants,
  networks,
}: {
  productId: string;
  variants: ArchiveOption[];
  networks: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    archiveProductToOffers,
    {},
  );
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      variants.map((v) => [
        v.variantId,
        { quantity: String(free(v)), price: v.costPrice > 0 ? String(v.costPrice) : "" },
      ]),
    ),
  );
  const offerable = variants.filter((v) => free(v) > 0);
  const onNetwork = variants.reduce((total, v) => total + v.onNetwork, 0);
  const canOffer = offerable.length > 0 && networks.length > 0;
  const items = canOffer
    ? offerable.map((v) => ({
        variantId: v.variantId,
        quantity: Number(rows[v.variantId]!.quantity || 0),
        transferPrice: Number(rows[v.variantId]!.price || 0),
      }))
    : [];
  const offering = items.filter((i) => i.quantity > 0);

  function update(variantId: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [variantId]: { ...prev[variantId]!, ...patch } }));
  }

  return (
    <form action={action} className="space-y-md">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}

      {onNetwork > 0 && (
        <p className="rounded-lg bg-info-container px-4 py-3 font-body-md text-body-md text-on-info-container">
          {onNetwork === 1 ? "1 peça já está" : `${onNetwork} peças já estão`} em ofertas na rede.
          Essas ofertas continuam ativas depois de arquivar — para tirá-las da rede, use
          &ldquo;Cancelar oferta&rdquo; na página de cada uma, em Rede.
        </p>
      )}

      {!canOffer ? (
        <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
          {networks.length === 0
            ? "Você não participa de nenhuma rede, então nenhuma oferta será publicada."
            : variants.length > 0
              ? "Todo o estoque deste produto já está na rede, então nenhuma oferta nova será publicada."
              : "Este produto está sem estoque, então nenhuma oferta será publicada."}{" "}
          O produto só será arquivado.
        </p>
      ) : (
        <>
          <p className="font-body-md text-body-md text-on-surface-variant">
            As peças em estoque viram ofertas para as outras revendedoras da rede. Ajuste a
            quantidade e o preço de repasse; deixe 0 para não ofertar uma variação.
          </p>
          {networks.length > 1 ? (
            <div>
              <label
                htmlFor="archive-network"
                className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
              >
                Rede
              </label>
              <select id="archive-network" name="networkId" className={fieldClass}>
                {networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <input type="hidden" name="networkId" value={networks[0]!.id} />
              <p className="font-body-md text-body-md text-on-surface">
                Rede: <strong>{networks[0]!.name}</strong>
              </p>
            </>
          )}

          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest shadow-surface">
            {variants.map((v) => (
              <li
                key={v.variantId}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_8rem_10rem] sm:items-end"
              >
                <div>
                  <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                    {v.label}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {v.stock} em estoque
                    {v.onNetwork > 0 && ` · ${v.onNetwork} já na rede`} · custo{" "}
                    {formatBRL(v.costPrice)}
                  </p>
                </div>
                {free(v) === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant sm:col-span-2">
                    Todo o estoque já está na rede.
                  </p>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor={`qty-${v.variantId}`}
                        className="mb-1 block font-body-md text-body-md text-on-surface-variant"
                      >
                        Quantidade
                      </label>
                      <input
                        id={`qty-${v.variantId}`}
                        type="number"
                        min={0}
                        max={free(v)}
                        step={1}
                        value={rows[v.variantId]!.quantity}
                        onChange={(e) => update(v.variantId, { quantity: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`price-${v.variantId}`}
                        className="mb-1 block font-body-md text-body-md text-on-surface-variant"
                      >
                        Preço de repasse (R$)
                      </label>
                      <input
                        id={`price-${v.variantId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        required={Number(rows[v.variantId]!.quantity) > 0}
                        value={rows[v.variantId]!.price}
                        onChange={(e) => update(v.variantId, { price: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          {offering.length > 0
            ? `Arquivar e publicar ${offering.length} oferta${offering.length === 1 ? "" : "s"}`
            : "Arquivar produto"}
        </Button>
      </div>
    </form>
  );
}
