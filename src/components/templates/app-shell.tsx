import { BottomNav } from "@/components/organisms/bottom-nav";
import { SidebarNav } from "@/components/organisms/sidebar-nav";
import { TopAppBar } from "@/components/organisms/top-app-bar";
import type { AppNotification } from "@/features/notifications/queries";

export interface AppShellProps {
  children: React.ReactNode;
  avatarUrl?: string | null;
  role?: "RESELLER" | "FACTORY_ADMIN" | "PLATFORM_ADMIN";
  orgName?: string;
  userName?: string;
  notifications?: AppNotification[];
  unreadCount?: number;
}

/**
 * Authenticated layout.
 * - lg+: persistent left sidebar, roomy content column.
 * - < lg: top bar + mobile bottom nav.
 */
export function AppShell({
  children,
  avatarUrl,
  role,
  orgName,
  userName,
  notifications = [],
  unreadCount = 0,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav role={role} orgName={orgName} userName={userName} avatarUrl={avatarUrl} />

      <div className="lg:pl-64">
        <TopAppBar
          avatarUrl={avatarUrl}
          userName={userName}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <main className="mx-auto w-full max-w-5xl px-margin-mobile pb-28 pt-lg sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
