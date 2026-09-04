"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button, Icon, TextField } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { AVATAR_COMPRESSION, compressImage } from "@/lib/utils/image";
import { updateProfile, type ProfileState } from "../actions";
import { AVATAR_MAX_BYTES } from "../validation";
import type { MyProfile } from "../queries";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const [preview, setPreview] = useState<string | null>(profile.avatarUrl);
  const [removed, setRemoved] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const avatarFile = useRef<File | null>(null);
  const objectUrl = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [state, action, pending] = useActionState<ProfileState, FormData>(async (prev, fd) => {
    // O input do DOM carrega o arquivo original; o que vai é o comprimido.
    // Sem versão comprimida (handler ainda não rodou), o original do input
    // segue — apagar aqui perderia a foto em silêncio. Na remoção o input já
    // foi limpo, então não sobra nada para enviar.
    if (avatarFile.current) fd.set("avatar", avatarFile.current);
    return updateProfile(prev, fd);
  }, {});

  useEffect(() => {
    if (state.ok) toast({ message: state.ok, variant: "success" });
  }, [state.ok, toast]);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPickError(null);
    setRemoved(false);

    // Preview imediato com o arquivo original; a compressão vem em seguida.
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    avatarFile.current = file;

    setOptimizing(true);
    try {
      const optimized = await compressImage(file, AVATAR_COMPRESSION);
      avatarFile.current = optimized;
      if (optimized.size > AVATAR_MAX_BYTES) setPickError("A imagem deve ter no máximo 5 MB.");
    } finally {
      setOptimizing(false);
    }
  };

  const removePhoto = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    avatarFile.current = null;
    if (fileRef.current) fileRef.current.value = "";
    setPickError(null);
    setPreview(null);
    setRemoved(true);
  };

  const errorMessage = pickError ?? state.error;

  return (
    <form action={action} className="space-y-lg">
      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {errorMessage}
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
            {optimizing ? "Otimizando a imagem…" : "JPG, PNG ou WebP, até 5 MB."}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="edit" size={16} />
              {preview ? "Trocar imagem" : "Escolher imagem"}
            </Button>
            {preview && (
              <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                <Icon name="delete" size={16} />
                Remover foto
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          {removed && <input type="hidden" name="removeAvatar" value="1" />}
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
        <Button
          type="submit"
          size="lg"
          loading={pending || optimizing}
          disabled={optimizing}
          className="w-full sm:w-auto sm:px-10"
        >
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
