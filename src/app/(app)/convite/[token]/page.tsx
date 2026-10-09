import type { Metadata } from "next";
import { requireUser } from "@/features/auth/queries";
import { AcceptInviteForm } from "@/features/network/components/accept-invite-form";
import { needsPassword } from "@/features/network/invite-password";
import { Logo } from "@/components/atoms";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  const { token } = await params;

  return (
    <div className="mx-auto max-w-md space-y-lg py-8 text-center">
      <Logo size={48} className="justify-center" />
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Você foi convidada para uma rede
        </h1>
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          Ao aceitar, sua loja passa a fazer parte da rede da fábrica e você poderá negociar peças
          com outras revendedoras.
        </p>
      </div>
      <AcceptInviteForm token={token} needsPassword={needsPassword(user)} />
    </div>
  );
}
