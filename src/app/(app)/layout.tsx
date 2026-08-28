import { AppShell } from "@/components/templates/app-shell";
import { requireUser } from "@/features/auth/queries";
import { getActiveOrganization } from "@/features/organizations/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const org = await getActiveOrganization();

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const userName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Conta";

  return (
    <AppShell avatarUrl={avatarUrl} role={org?.role} orgName={org?.name} userName={userName}>
      {children}
    </AppShell>
  );
}
