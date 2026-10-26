// Rendered on the server (UTC on Netlify) — pin the reseller's timezone.
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** VES-83 — why, when and by whom a sale was cancelled (BR-SALE-06). */
export function SaleCancellation({
  reason,
  cancelledAt,
  cancelledBy,
}: {
  reason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
}) {
  const rows = [
    { label: "Motivo", value: reason?.trim() || "Não informado" },
    { label: "Cancelada em", value: cancelledAt ? DATE_TIME.format(new Date(cancelledAt)) : "—" },
    { label: "Cancelada por", value: cancelledBy ?? "—" },
  ];

  return (
    <section
      aria-label="Cancelamento"
      className="space-y-sm rounded-xl border border-error/40 bg-error-container/30 p-lg"
    >
      <h2 className="font-label-md text-label-md uppercase tracking-wider text-error">
        Venda cancelada
      </h2>
      <dl className="space-y-xs">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex flex-wrap justify-between gap-x-4 font-body-md text-body-md"
          >
            <dt className="text-on-surface-variant">{r.label}</dt>
            <dd className="text-on-surface">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
