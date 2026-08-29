import { Logo } from "@/components/atoms";
import { Reveal } from "@/components/motion";

/**
 * Shared two-panel shell for the unauthenticated screens (login, password
 * recovery). Brand panel on the left (desktop only), content on the right.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen">
      {/* Brand panel — desktop only. Deep purple in every theme (decorative). */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#3f0a75] bg-gradient-to-br from-[#4a0d85] to-[#2a0552] p-12 text-white lg:flex xl:w-[45%]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#fe4cca]/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#7027b8]/50 blur-3xl"
        />
        <Logo size={32} className="relative" />
        <div className="relative max-w-md">
          <h2 className="font-display-lg text-display-lg leading-tight">
            Sua rede vende melhor conectada.
          </h2>
          <p className="mt-lg font-body-lg text-body-lg text-white/80">
            Gestão de estoque, clientes e vendas — e uma rede privada para circular as peças com
            outras revendedoras da sua fábrica.
          </p>
        </div>
        <p className="relative font-label-md text-label-md uppercase tracking-widest text-white/60">
          Vestiq · B2B fashion
        </p>
      </section>

      {/* Content panel */}
      <section className="flex flex-1 flex-col justify-center bg-surface px-6 py-12 sm:px-12">
        <Reveal className="mx-auto w-full max-w-sm">
          <div className="mb-xl flex justify-center lg:hidden">
            <Logo size={40} />
          </div>
          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
          </div>
          {children}
        </Reveal>
      </section>
    </main>
  );
}
