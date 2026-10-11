import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { AcceptInviteForm } from "@/features/network/components/accept-invite-form";
import { needsPassword } from "@/features/network/invite-password";

export const metadata: Metadata = { title: "Convite" };

/**
 * RF-NET-004 — landing of the network invite link. Public route (VES-95): the
 * invitee may not have a session, or even an account, when she opens it.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/convite/${token}`)}`);

  return (
    <AuthScreen
      title="Você foi convidada para uma rede"
      subtitle="Ao aceitar, sua loja passa a fazer parte da rede da fábrica e você poderá negociar peças com outras revendedoras."
    >
      <AcceptInviteForm token={token} needsPassword={needsPassword(user)} />
    </AuthScreen>
  );
}
