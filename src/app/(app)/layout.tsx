import { AppShell } from "@/components/templates/app-shell";
import { requireUser } from "@/features/auth/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  return <AppShell avatarUrl={avatarUrl}>{children}</AppShell>;
}
