"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button, Icon, TextField } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { updateProfile, type ProfileState } from "../actions";
import type { MyProfile } from "../queries";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [preview, setPreview] = useState<string | null>(profile.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ message: state.ok, variant: "success" });
  }, [state.ok, toast]);

  return (
    <form action={action} className="space-y-lg">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-success-container px-4 py-3 font-body-md text-body-md text-on-success-container">
          {state.ok}
        </p>
      )}

      <section className="flex flex-col items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface sm:flex-row">
        <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high text-on-surface-variant">
          {preview ? (
            <Image
              src={preview}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon name="person" size={40} />
          )}
        </span>
        <div className="text-center sm:text-left">
          <p className="font-title-lg text-title-lg text-on-surface">Foto do perfil</p>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            JPG, PNG ou WebP, até 5 MB.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="edit" size={16} />
            Escolher imagem
          </Button>
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
        </div>
      </section>

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <TextField label="Nome completo" name="fullName" defaultValue={profile.fullName} required />
        <TextField
          label="Email"
          name="email"
          type="email"
          defaultValue={profile.email}
          hint="Ao trocar o email você recebe uma mensagem de confirmação."
        />
        <TextField
          label="Data de nascimento"
          name="birthDate"
          type="date"
          defaultValue={profile.birthDate ?? ""}
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
