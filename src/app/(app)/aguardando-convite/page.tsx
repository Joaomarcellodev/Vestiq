import type { Metadata } from "next";
import { signOut } from "@/features/auth/actions";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Aguardando convite" };

export default function WaitingForInvitePage() {
  return (
    <div className="mx-auto max-w-md space-y-lg py-12 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-fixed text-primary-container">
        <Icon name="mail" size={32} />
      </span>
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Aguardando convite
        </h1>
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          Sua conta ainda não está vinculada a nenhuma organização. Peça à sua fábrica um convite
          para a rede — ao aceitá-lo você terá acesso à plataforma.
        </p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
