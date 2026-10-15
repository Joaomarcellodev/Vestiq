"use client";

import { Button } from "@/components/atoms";
import { ErrorScreen } from "@/components/molecules/error-screen";
import "./globals.css";

/**
 * Last resort when the root layout itself fails: it replaces the layout, so it
 * renders its own <html>/<body> (VES-58). Plain <a> — the router may be the
 * thing that broke.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="grid min-h-screen place-items-center bg-surface px-md">
          <ErrorScreen
            title="O Vestiq teve um problema"
            description="Algo inesperado aconteceu ao abrir o aplicativo. Tente novamente."
            actions={
              <>
                <Button variant="secondary" onClick={reset}>
                  Tentar de novo
                </Button>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose */}
                <a href="/">
                  <Button>Ir para o início</Button>
                </a>
              </>
            }
          />
        </main>
      </body>
    </html>
  );
}
