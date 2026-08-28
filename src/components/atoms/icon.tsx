import { cn } from "@/lib/utils/cn";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols Outlined ligature name, e.g. "mail", "lock". */
  name: string;
  filled?: boolean;
  /** Optical size / font-size in px. */
  size?: number;
}

/** Material Symbols Outlined icon. Font loaded in globals.css. */
export function Icon({ name, filled = false, size = 24, className, style, ...props }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
