"use client";

import Link from "next/link";
import { Button } from "@/components/atoms";
import { ErrorScreen } from "@/components/molecules/error-screen";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const isPermission = /permitida|autoriz|not authorized|perfil/i.test(error.message);

  return (
    <ErrorScreen
      title={isPermission ? "Acesso não permitido" : "Algo deu errado"}
      description={
        isPermission
          ? "Sua conta não tem permissão para acessar esta área."
          : "Não foi possível carregar esta página. Tente novamente."
      }
      actions={
        <>
          {!isPermission && (
            <Button variant="secondary" onClick={reset}>
              Tentar de novo
            </Button>
          )}
          <Link href="/dashboard">
            <Button>Voltar ao início</Button>
          </Link>
        </>
      }
    />
  );
}
