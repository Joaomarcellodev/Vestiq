import { Icon } from "@/components/atoms";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** RNF-USA-003 — empty state. */
export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name={icon} size={24} />
      </span>
      <p className="font-title-lg text-title-lg text-on-surface">{title}</p>
      {description && (
        <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">{description}</p>
      )}
      {action}
    </div>
  );
}
