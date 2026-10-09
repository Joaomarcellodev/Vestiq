"use client";

import Link from "next/link";
import { Button, Checkbox, TextField } from "@/components/atoms";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { signInWithPassword, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function LoginForm({
  next,
  linkError,
}: {
  next: string;
  /**
   * An email link (invite or password reset) that was expired or already
   * used — see /auth/confirm and /auth/callback.
   */
  linkError?: boolean;
}) {
  const { state, pending, formProps } = useFormSubmit(signInWithPassword, initialState);

  return (
    <div className="w-full max-w-md">
      {(state.error || linkError) && (
        <div
          role="alert"
          className="mb-md rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error ??
            "Este link expirou ou já foi usado. Entre com email e senha, peça um novo link em “Esqueci minha senha” ou um novo convite à fábrica."}
        </div>
      )}

      <form {...formProps} className="space-y-md" noValidate>
        <input type="hidden" name="next" value={next} />

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

        <TextField
          label="Senha"
          name="password"
          autoComplete="current-password"
          leadingIcon="lock"
          placeholder="••••••••"
          revealable
          required
          error={state.fieldErrors?.password}
        />

        <div className="flex items-center justify-between pt-sm">
          <Checkbox label="Lembrar-me" name="remember" value="true" />
          <Link
            href="/recuperar-senha"
            className="font-body-md text-body-md font-semibold text-primary-container transition-colors hover:text-primary"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Entrar na plataforma
        </Button>
      </form>

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Recebeu um convite? Abra o link enviado pela sua fábrica para entrar na rede.
      </p>
    </div>
  );
}
