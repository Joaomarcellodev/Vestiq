import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export interface LogoProps {
  /** Icon height in px. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 40, withWordmark = true, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo02.jpeg"
        alt="Vestiq"
        width={size}
        height={size}
        priority
        className="rounded-md object-contain"
      />
      {withWordmark && (
        <span
          className="font-display-lg tracking-tight"
          style={{ fontSize: size * 0.62, fontWeight: 700 }}
        >
          VESTIQ
        </span>
      )}
    </span>
  );
}
