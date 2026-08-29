"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Icon, TextField } from "@/components/atoms";
import { requestPasswordReset, type ResetRequestState } from "../actions";

const initialState: ResetRequestState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.ok) {
    return (
      <div className="w-full max-w-md space-y-md">
        <div className="flex items-start gap-3 rounded-lg bg-success-container px-4 py-3 text-on-success-container">
          <Icon name="check_circle" size={20} className="mt-0.5" />
          <p className="font-body-md text-body-md">
            Se existe uma conta com esse email, enviamos um link para redefinir a senha. Verifique
            sua caixa de entrada e o spam.
          </p>
        </div>
        <Link
          href="/login"
          className="font-body-md text-body-md font-semibold text-primary-container transition-colors hover:text-primary"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form action={formAction} className="space-y-md" noValidate>
        <TextField
          label="Email profissional"
          name="email"
          type="email"
          autoComplete="email"
          leadingIcon="mail"
          placeholder="nome@empresa.com.br"
          required
          error={state.fieldErrors?.email}
        />

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Enviar link de redefinição
        </Button>
      </form>

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-semibold text-primary-container hover:text-primary">
          Entrar
        </Link>
      </p>
    </div>
  );
}
