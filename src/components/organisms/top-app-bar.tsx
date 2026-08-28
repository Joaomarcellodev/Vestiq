import { Icon, Logo } from "@/components/atoms";

export interface TopAppBarProps {
  /** Optional user avatar URL. */
  avatarUrl?: string | null;
}

/** Shared top bar — logo + notifications, matching the design prototypes. */
export function TopAppBar({ avatarUrl }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-surface-container-high">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="person" size={18} />
            )}
          </span>
          <Logo size={24} />
        </div>
        <button
          type="button"
          aria-label="Notificações"
          className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="notifications" size={22} />
        </button>
      </div>
    </header>
  );
}
