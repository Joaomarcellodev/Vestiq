import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { getMySuspension } from "@/features/organizations/queries";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Conta suspensa" };

/**
 * VES-44 — where a session that was open when the store got suspended lands
 * (`requireActiveOrganization`). New logins are refused on the login screen.
 */
export default async function SuspendedAccountPage() {
  const suspension = await getMySuspension();
  if (!suspension) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-md space-y-lg px-margin-mobile py-12 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-error-container text-on-error-container">
        <Icon name="block" size={32} />
      </span>
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Conta suspensa
        </h1>
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          A conta de {suspension.organizationName} foi suspensa pela moderação do Vestiq. Enquanto
          ela estiver suspensa, ninguém da loja consegue usar a plataforma e as ofertas dela não
          aparecem na rede.
        </p>
        {suspension.reason && (
          <p className="mt-md rounded-lg bg-surface-container-low px-4 py-3 text-left font-body-md text-body-md text-on-surface">
            <span className="font-semibold">Motivo:</span> {suspension.reason}
          </p>
        )}
        <p className="mt-md font-body-md text-body-md text-on-surface-variant">
          Para recorrer, fale com o suporte do Vestiq.
        </p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sair da conta
        </Button>
      </form>
    </main>
  );
}
