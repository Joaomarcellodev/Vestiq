export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h1>
        {description && (
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
