import { Badge } from "@/components/atoms";
import type { StockLevel } from "@/features/inventory/classify";

const MAP: Record<
  StockLevel,
  { tone: "success" | "warning" | "error"; text: (n: number) => string }
> = {
  ok: { tone: "success", text: (n) => `${n} em estoque` },
  low: { tone: "warning", text: (n) => `${n} — estoque baixo` },
  out: { tone: "error", text: () => "Sem estoque" },
};

export function StockBadge({ level, stock }: { level: StockLevel; stock: number }) {
  const cfg = MAP[level];
  return <Badge tone={cfg.tone}>{cfg.text(stock)}</Badge>;
}
