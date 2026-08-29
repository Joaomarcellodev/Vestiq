"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Checkbox, Icon, TextField } from "@/components/atoms";
import { signInWithOAuth, signInWithPassword, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function LoginForm({ next, oauthError }: { next: string; oauthError?: boolean }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);

  return (
    <div className="w-full max-w-md">
      {(state.error || oauthError) && (
        <div
          role="alert"
          className="mb-md rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error ?? "Não foi possível concluir o login social. Tente novamente."}
        </div>
      )}

      <form action={formAction} className="space-y-md" noValidate>
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

      <div className="my-lg flex items-center gap-4">
        <span className="h-px flex-1 bg-outline-variant" />
        <span className="font-body-md text-body-md text-on-surface-variant">ou</span>
        <span className="h-px flex-1 bg-outline-variant" />
      </div>

      <OAuthButton provider="google" next={next} label="Continuar com Google" icon="google" />

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Recebeu um convite? Abra o link enviado pela sua fábrica para entrar na rede.
      </p>
    </div>
  );
}

function OAuthButton({
  provider,
  next,
  label,
  icon,
}: {
  provider: "google";
  next: string;
  label: string;
  icon: string;
}) {
  return (
    <form action={signInWithOAuth}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="secondary" fullWidth>
        <Icon name={icon} size={18} />
        {label}
      </Button>
    </form>
  );
}
