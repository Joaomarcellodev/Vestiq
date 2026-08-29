"use client";

import { useActionState, useState } from "react";
import { Button, TextField } from "@/components/atoms";
import { updateProduct, type ActionState } from "../actions";
import { ImageUploadField } from "./image-upload-field";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  internal_sku: string | null;
  description: string | null;
  image_urls: string[];
}

export function EditProductForm({
  product,
  categories,
}: {
  product: Product;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProduct, {});
  const [images, setImages] = useState<File[]>([]);
  const [existing, setExisting] = useState<string[]>(product.image_urls ?? []);

  return (
    <form
      action={(fd) => {
        fd.set("existingImages", JSON.stringify(existing));
        fd.delete("images");
        images.forEach((f) => fd.append("images", f));
        action(fd);
      }}
      className="space-y-md"
    >
      <input type="hidden" name="id" value={product.id} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          {state.error}
        </p>
      )}
      <TextField label="Nome do produto" name="name" defaultValue={product.name} required />
      <TextField
        label="SKU (código interno)"
        name="internalSku"
        defaultValue={product.internal_sku ?? ""}
      />
      <TextField label="Marca" name="brand" defaultValue={product.brand ?? ""} />
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Categoria
        </label>
        <select
          name="categoryId"
          defaultValue={product.category_id ?? ""}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        >
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Descrição
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={product.description ?? ""}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md"
        />
      </div>
      <div>
        <label className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface">
          Fotos
        </label>
        <ImageUploadField
          files={images}
          onFilesChange={setImages}
          existing={existing}
          onExistingChange={setExisting}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-10">
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
