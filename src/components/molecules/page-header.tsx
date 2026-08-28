export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
        {description && (
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 [&_a]:inline-block">{action}</div>}
    </header>
  );
}
