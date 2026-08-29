import type { Metadata } from "next";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta Vestiq para gerenciar seu estoque e sua rede.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <AuthScreen title="Bem-vindo de volta" subtitle="Acesse sua conta para gerenciar seu negócio.">
      <LoginForm next={safeNext} oauthError={error === "oauth"} />
    </AuthScreen>
  );
}
