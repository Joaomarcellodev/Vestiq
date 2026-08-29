import Link from "next/link";
import { Icon, Logo } from "@/components/atoms";
import { NotificationBell } from "@/components/organisms/notification-bell";
import type { AppNotification } from "@/features/notifications/queries";

export interface TopAppBarProps {
  avatarUrl?: string | null;
  userName?: string;
  notifications?: AppNotification[];
  unreadCount?: number;
}

/**
 * Compact top bar. Full-width on mobile (logo + notifications); on desktop the
 * sidebar owns branding so this only carries the page-level actions.
 */
export function TopAppBar({
  avatarUrl,
  userName,
  notifications = [],
  unreadCount = 0,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-margin-mobile lg:h-16 lg:px-8">
        <div className="lg:hidden">
          <Logo size={24} />
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-2">
          <NotificationBell initialNotifications={notifications} initialUnread={unreadCount} />
          {/* Profile affordance — mobile only; on desktop the sidebar owns it. */}
          <Link
            href="/perfil"
            aria-label="Meu perfil"
            title={userName ?? "Meu perfil"}
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-surface-container-high text-on-surface-variant transition-shadow hover:ring-2 hover:ring-primary-container lg:hidden"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="person" size={18} />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
