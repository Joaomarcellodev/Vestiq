import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/queries";
import { signOut } from "@/features/auth/actions";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { LoginForm } from "@/features/auth/components/login-form";
import { AcceptInviteForm } from "@/features/network/components/accept-invite-form";
import { InviteSignupForm } from "@/features/network/components/invite-signup-form";
import { needsPassword } from "@/features/network/invite-password";
import { Button } from "@/components/atoms";

export const metadata: Metadata = { title: "Convite" };

const linkClass = "font-semibold text-primary-container hover:text-primary";

/**
 * RF-NET-004 — landing of the network invite link. Public route (VES-95): the
 * invitee may not have a session, or even an account, when she opens it.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // A malformed token fails the uuid cast — same as an unknown one: no invite.
  const [user, { data: invite }] = await Promise.all([
    getCurrentUser(),
    supabase.rpc("get_network_invite", { p_token: token }).maybeSingle(),
  ]);
  const here = `/convite/${token}`;

  if (!invite) {
    return (
      <AuthScreen
        title="Convite inválido"
        subtitle="Não encontramos este convite. Confira se o link está completo ou peça um novo convite à fábrica."
      >
        <Link href="/login" className={linkClass}>
          Ir para o login
        </Link>
      </AuthScreen>
    );
  }

  if (invite.state === "EXPIRED") {
    return (
      <AuthScreen
        title="Convite expirado"
        subtitle={`Este convite para a rede ${invite.network_name} passou do prazo. Peça um novo convite à ${invite.factory_name}.`}
      >
        <Link href="/login" className={linkClass}>
          Ir para o login
        </Link>
      </AuthScreen>
    );
  }

  if (invite.state === "USED") {
    return (
      <AuthScreen
        title="Convite já utilizado"
        subtitle={`Este convite para a rede ${invite.network_name} já foi aceito. Entre com seu email e senha para acessar.`}
      >
        <Link href={user ? "/dashboard" : "/login"} className={linkClass}>
          {user ? "Ir para o painel" : "Ir para o login"}
        </Link>
      </AuthScreen>
    );
  }

  const title = `Você foi convidada para a rede ${invite.network_name}`;

  if (user && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <AuthScreen
        title={title}
        subtitle={`Este convite é para ${invite.email}, mas você está conectada como ${user.email}.`}
      >
        <form action={signOut}>
          <input type="hidden" name="next" value={here} />
          <Button type="submit" fullWidth size="lg">
            Sair e continuar com {invite.email}
          </Button>
        </form>
      </AuthScreen>
    );
  }

  if (user) {
    return (
      <AuthScreen
        title={title}
        subtitle={`Ao aceitar, sua loja passa a fazer parte da rede da ${invite.factory_name} e você poderá negociar peças com outras revendedoras.`}
      >
        <AcceptInviteForm token={token} needsPassword={needsPassword(user)} />
      </AuthScreen>
    );
  }

  if (invite.has_account) {
    return (
      <AuthScreen
        title={title}
        subtitle={`Você já tem uma conta com ${invite.email}. Entre para aceitar o convite.`}
      >
        <LoginForm next={here} inviteHint={false} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={title}
      subtitle={`Crie sua conta para entrar na rede da ${invite.factory_name} e negociar peças com outras revendedoras.`}
    >
      <InviteSignupForm token={token} email={invite.email} />
    </AuthScreen>
  );
}
