"use client";

import Link from "next/link";
import { Button, Icon } from "@/components/atoms";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const isPermission = /permitida|autoriz|not authorized|perfil/i.test(error.message);

  return (
    <div className="mx-auto max-w-md space-y-lg py-12 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-error-container text-on-error-container">
        <Icon name="warning" size={28} />
      </span>
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {isPermission ? "Acesso não permitido" : "Algo deu errado"}
        </h1>
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          {isPermission
            ? "Sua conta não tem permissão para acessar esta área."
            : "Não foi possível carregar esta página. Tente novamente."}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        {!isPermission && (
          <Button variant="secondary" onClick={reset}>
            Tentar de novo
          </Button>
        )}
        <Link href="/dashboard">
          <Button>Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}
