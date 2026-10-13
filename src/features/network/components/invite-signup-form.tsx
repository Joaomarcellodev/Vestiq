"use client";

import Link from "next/link";
import { Button, TextField } from "@/components/atoms";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { signUpFromInvite, type InviteSignupState } from "../actions";

const initialState: InviteSignupState = {};

/**
 * VES-95 — first visit to the invite link without a session: the invitee
 * creates her account for the invited email and joins the network.
 */
export function InviteSignupForm({ token, email }: { token: string; email: string }) {
  const { state, pending, formProps } = useFormSubmit(signUpFromInvite, initialState);

  return (
    <div className="w-full max-w-md">
      {state.error && (
        <p
          role="alert"
          className="mb-md rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}

      <form {...formProps} className="space-y-md" noValidate>
        <input type="hidden" name="token" value={token} />

        <TextField
          label="Email"
          type="email"
          value={email}
          readOnly
          disabled
          leadingIcon="mail"
          hint="O convite foi enviado para este email — ele será o seu login."
        />

        <TextField
          label="Nome da sua loja"
          name="resellerName"
          placeholder="Ex: Atelier Sarah"
          autoComplete="organization"
          required
          error={state.fieldErrors?.resellerName}
        />

        <TextField
          label="Crie sua senha"
          name="password"
          autoComplete="new-password"
          leadingIcon="lock"
          revealable
          required
          hint="No mínimo 8 caracteres."
          error={state.fieldErrors?.password}
        />

        <TextField
          label="Confirme a senha"
          name="confirm"
          autoComplete="new-password"
          leadingIcon="lock"
          revealable
          required
          error={state.fieldErrors?.confirm}
        />

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Criar conta e entrar na rede
        </Button>
      </form>

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Já tem conta?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(`/convite/${token}`)}`}
          className="font-semibold text-primary-container hover:text-primary"
        >
          Entrar para aceitar
        </Link>
      </p>
    </div>
  );
}
