import type { Metadata } from "next";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link para redefinir a senha da sua conta Vestiq.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthScreen
      title="Esqueceu a senha?"
      subtitle="Informe seu email e enviaremos um link para você criar uma nova senha."
    >
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
