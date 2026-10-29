"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Button, TextField } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { updateOrganizationCity, type OrganizationState } from "../actions";

const initialState: OrganizationState = {};

/** VES-65 — "Sua loja na rede" section of /perfil: the city on the public profile. */
export function OrganizationCityForm({
  orgName,
  city,
  profileHref,
}: {
  orgName: string;
  city: string | null;
  /** Link to the public profile, for resellers. */
  profileHref?: string;
}) {
  const [state, formAction, pending] = useActionState(updateOrganizationCity, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ message: state.ok, variant: "success" });
  }, [state, toast]);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
      <p className="font-title-lg text-title-lg text-on-surface">Sua loja na rede</p>
      <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
        As revendedoras da sua rede veem o nome, a cidade e as ofertas ativas de {orgName}.
        {profileHref && (
          <>
            {" "}
            <Link
              href={profileHref}
              className="font-semibold text-primary-container hover:underline"
            >
              Ver meu perfil público
            </Link>
          </>
        )}
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-md rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-md space-y-md">
        <TextField
          label="Cidade"
          name="city"
          defaultValue={city ?? ""}
          maxLength={80}
          placeholder="Ex.: Teresina, PI"
          hint="Deixe em branco para não exibir."
        />
        <Button type="submit" variant="secondary" loading={pending} className="w-full sm:w-auto">
          Salvar cidade
        </Button>
      </form>
    </section>
  );
}
