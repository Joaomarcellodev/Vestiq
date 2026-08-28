import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/queries";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/atoms";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Bom dia{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Aqui está um resumo das suas operações hoje.
        </p>
      </header>

      {/* Placeholder — Sprint 3/6 (RF-DASH-001) implementa os indicadores reais. */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Os indicadores do dashboard serão implementados na Sprint de Operações.
        </p>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
