import { BottomNav } from "@/components/organisms/bottom-nav";
import { TopAppBar } from "@/components/organisms/top-app-bar";

export interface AppShellProps {
  children: React.ReactNode;
  avatarUrl?: string | null;
}

/** DashboardTemplate — authenticated layout with top bar and mobile bottom nav. */
export function AppShell({ children, avatarUrl }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopAppBar avatarUrl={avatarUrl} />
      <main className="mx-auto max-w-5xl px-margin-mobile pb-24 pt-lg md:px-margin-desktop md:pb-lg">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
