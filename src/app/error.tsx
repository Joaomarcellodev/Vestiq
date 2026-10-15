"use client";

import Link from "next/link";
import { Button } from "@/components/atoms";
import { ErrorScreen } from "@/components/molecules/error-screen";

/**
 * Errors in the public routes (login, password recovery) — the signed-in area
 * has its own `(app)/error.tsx` inside the app shell (VES-58).
 */
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-md">
      <ErrorScreen
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente novamente em instantes."
        actions={
          <>
            <Button variant="secondary" onClick={reset}>
              Tentar de novo
            </Button>
            <Link href="/">
              <Button>Ir para o início</Button>
            </Link>
          </>
        }
      />
    </main>
  );
}
