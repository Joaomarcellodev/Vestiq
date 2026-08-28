import { Icon, Logo } from "@/components/atoms";

export interface TopAppBarProps {
  avatarUrl?: string | null;
}

/**
 * Compact top bar. Full-width on mobile (logo + notifications); on desktop the
 * sidebar owns branding so this only carries the page-level actions.
 */
export function TopAppBar({ avatarUrl }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-margin-mobile lg:h-16 lg:px-8">
        <div className="lg:hidden">
          <Logo size={24} />
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notificações"
            className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="notifications" size={20} />
          </button>
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-surface-container-high text-on-surface-variant">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="person" size={16} />
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
