import type { Metadata } from "next";
import { Logo } from "@/components/atoms";
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
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Brand / hero — desktop only (login/code.html) */}
      <section className="relative hidden flex-1 overflow-hidden bg-surface-container-high md:flex">
        <div className="absolute inset-0 bg-gradient-to-tr from-surface/80 via-surface/40 to-transparent" />
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-end p-margin-desktop">
          <h2 className="mb-lg font-display-lg text-display-lg text-on-surface">
            Sua rede vende melhor conectada.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            O Vestiq é a plataforma de gestão para o mercado de revenda de moda. Conecte seu estoque
            às oportunidades da sua rede.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="relative z-10 flex flex-1 flex-col justify-center bg-surface px-margin-mobile py-12 md:px-margin-desktop md:py-0">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-xl flex justify-center md:justify-start">
            <Logo size={56} />
          </div>
          <div className="mb-lg text-center md:text-left">
            <h1 className="mb-sm font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
              Bem-vindo de volta
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Acesse sua conta para gerenciar seu estoque.
            </p>
          </div>
          <LoginForm next={safeNext} oauthError={error === "oauth"} />
        </div>
      </section>
    </main>
  );
}
