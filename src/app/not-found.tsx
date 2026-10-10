import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/atoms";
import { ErrorScreen } from "@/components/molecules/error-screen";

export const metadata: Metadata = { title: "Página não encontrada" };

/** Unknown URLs, and `notFound()` outside the signed-in area (VES-58). */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-md">
      <ErrorScreen
        icon="search"
        tone="neutral"
        title="Página não encontrada"
        description="O endereço pode estar errado ou a página não existe mais."
        actions={
          <Link href="/">
            <Button>Ir para o início</Button>
          </Link>
        }
      />
    </main>
  );
}
