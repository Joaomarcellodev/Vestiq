import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";

/** Read-only 1–5 stars (SPEC-016); the label carries the value for screen readers. */
export function StarRating({ value, size = 18 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`Nota ${value.toLocaleString("pt-BR")} de 5`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={size}
          fill={n <= rounded ? "currentColor" : "none"}
          className={cn(n <= rounded ? "text-secondary" : "text-outline")}
        />
      ))}
    </span>
  );
}
