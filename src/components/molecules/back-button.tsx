"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/atoms";

/** Consistent "voltar" control for detail and form screens. */
export function BackButton({
  fallback = "/dashboard",
  label = "Voltar",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-body-md text-body-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
    >
      <Icon name="chevron_left" size={18} />
      {label}
    </button>
  );
}
