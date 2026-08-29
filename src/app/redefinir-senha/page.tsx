import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Escolha uma nova senha para sua conta Vestiq.",
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <AuthScreen
      title="Criar nova senha"
      subtitle="Escolha uma senha forte para proteger sua conta."
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="w-full max-w-md space-y-md">
          <p className="rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
            Este link de redefinição é inválido ou expirou.
          </p>
          <Link
            href="/recuperar-senha"
            className="font-body-md text-body-md font-semibold text-primary-container hover:text-primary"
          >
            Solicitar um novo link
          </Link>
        </div>
      )}
    </AuthScreen>
  );
}
