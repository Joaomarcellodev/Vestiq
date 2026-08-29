import { Suspense } from "react";
import { AppShell } from "@/components/templates/app-shell";
import { RouteProgress } from "@/components/organisms/route-progress";
import { FlashToaster } from "@/components/organisms/toast/flash-toaster";
import { requireUser } from "@/features/auth/queries";
import { getActiveOrganization } from "@/features/organizations/queries";
import { countUnreadNotifications, listNotifications } from "@/features/notifications/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [org, notifications, unreadCount] = await Promise.all([
    getActiveOrganization(),
    listNotifications(20),
    countUnreadNotifications(),
  ]);

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const userName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Conta";

  return (
    <>
      <Suspense fallback={null}>
        <RouteProgress />
        <FlashToaster />
      </Suspense>
      <AppShell
        avatarUrl={avatarUrl}
        role={org?.role}
        orgName={org?.name}
        userName={userName}
        notifications={notifications}
        unreadCount={unreadCount}
      >
        {children}
      </AppShell>
    </>
  );
}
