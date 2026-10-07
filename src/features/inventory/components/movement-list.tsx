import Link from "next/link";
import { Icon } from "@/components/atoms";
import { INVENTORY_MOVEMENT } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils/cn";
import { formatMovementQuantity, movementReferenceLink, type MovementType } from "../history";
import type { MovementRow } from "../queries";

const ICON: Record<MovementType, string> = {
  ENTRADA: "add_circle",
  SAIDA: "archive",
  AJUSTE: "edit",
  VENDA: "point_of_sale",
  CANCELAMENTO: "receipt_long",
  TRANSFERENCIA_ENTRADA: "swap_horiz",
  TRANSFERENCIA_SAIDA: "swap_horiz",
};

// Rendered on the server (UTC on Netlify) — pin the reseller's timezone.
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** RF-INV-004 — a variant's movements, newest first, each with its resulting balance. */
export function MovementList({ items }: { items: MovementRow[] }) {
  return (
    <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
      {items.map((m) => {
        const reference = movementReferenceLink(m.referenceType, m.referenceId);
        const incoming = m.quantity > 0;
        return (
          <li key={m.id} className="flex items-start gap-3 p-4">
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                incoming
                  ? "bg-success-container text-on-success-container"
                  : "bg-surface-container-high text-on-surface-variant",
              )}
            >
              <Icon name={ICON[m.type]} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md font-semibold text-on-surface">
                {INVENTORY_MOVEMENT[m.type]}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                <time dateTime={m.createdAt}>{DATE_TIME.format(new Date(m.createdAt))}</time>
              </p>
              {m.note && (
                <p className="break-words font-body-md text-body-md text-on-surface-variant">
                  {m.note}
                </p>
              )}
              {reference && (
                <Link
                  href={reference.href}
                  className="font-body-md text-body-md font-semibold text-primary hover:underline"
                >
                  {reference.label}
                </Link>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-title-lg text-title-lg",
                  incoming ? "text-on-success-container" : "text-error",
                )}
              >
                {formatMovementQuantity(m.quantity)}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                saldo {m.balanceAfter}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
