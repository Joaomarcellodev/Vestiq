"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms";
import { ImageUploadField } from "@/features/catalog/components/image-upload-field";
import { updateOfferPhotos, type ActionState } from "../actions";

/** AC-OFFER-008-02 — the owner adds, removes and reorders the offer's photos. */
export function OfferPhotosForm({ offerId, photos }: { offerId: string; photos: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOfferPhotos, {});
  const [existing, setExisting] = useState(photos);
  const [files, setFiles] = useState<File[]>([]);
  const changed = files.length > 0 || existing.join() !== photos.join();

  return (
    <form
      action={(fd) => {
        fd.set("existingImages", JSON.stringify(existing));
        fd.delete("images");
        files.forEach((f) => fd.append("images", f));
        action(fd);
      }}
      className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface"
    >
      <input type="hidden" name="offerId" value={offerId} />
      <h2 className="font-headline-md text-headline-md text-on-surface">Fotos da oferta</h2>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <ImageUploadField
        files={files}
        onFilesChange={setFiles}
        existing={existing}
        onExistingChange={setExisting}
        hint={
          existing.length + files.length === 0
            ? "Sem fotos próprias, a oferta mostra as fotos do produto."
            : undefined
        }
      />
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={!changed}>
          Salvar fotos
        </Button>
      </div>
    </form>
  );
}
