"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/atoms";
import { PRODUCT_COMPRESSION, compressImages } from "@/lib/utils/image";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  PRODUCT_IMAGE_TYPES,
} from "../validation";

interface Props {
  /** Newly-picked files (create + edit). */
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Already-uploaded image URLs to keep (edit only). */
  existing?: string[];
  onExistingChange?: (urls: string[]) => void;
}

export function ImageUploadField({ files, onFilesChange, existing = [], onExistingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  const total = existing.length + files.length;
  const canAdd = total < PRODUCT_IMAGE_MAX_COUNT;

  const addFiles = async (picked: FileList | null) => {
    if (!picked) return;
    const room = PRODUCT_IMAGE_MAX_COUNT - total;
    const chosen = Array.from(picked)
      .filter((f) => PRODUCT_IMAGE_TYPES.includes(f.type))
      .slice(0, Math.max(0, room));
    if (!chosen.length) return;

    setBusy(true);
    try {
      // Sem isso, cinco fotos de celular estouram o corpo do Server Action.
      const optimized = await compressImages(chosen, PRODUCT_COMPRESSION);
      const accepted = optimized.filter((f) => f.size <= PRODUCT_IMAGE_MAX_BYTES);
      setNotice(accepted.length < optimized.length ? "Ignoramos as imagens acima de 5 MB." : null);
      if (accepted.length) onFilesChange([...files, ...accepted]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-sm">
      <div className="flex flex-wrap gap-3">
        {existing.map((url) => (
          <Thumb
            key={url}
            src={url}
            onRemove={
              onExistingChange
                ? () => onExistingChange(existing.filter((u) => u !== url))
                : undefined
            }
          />
        ))}
        {previews.map((src, i) => (
          <Thumb
            key={src}
            src={src}
            onRemove={() => onFilesChange(files.filter((_, idx) => idx !== i))}
          />
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary-container"
          >
            <Icon name="add" size={20} />
            <span className="font-label-sm text-label-sm">Foto</span>
          </button>
        )}
      </div>

      <p className="font-label-md text-label-md text-on-surface-variant">
        {busy
          ? "Otimizando as imagens…"
          : `JPG, PNG ou WebP · até ${PRODUCT_IMAGE_MAX_COUNT} imagens · 5 MB cada`}
      </p>
      {notice && (
        <p role="status" className="font-label-md text-label-md text-error">
          {notice}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove?: () => void }) {
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <Image src={src} alt="" fill sizes="96px" className="object-cover" unoptimized />
      {onRemove && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onRemove}
          aria-label="Remover imagem"
          className="absolute right-1 top-1 h-6 w-6 rounded-full p-0"
        >
          <Icon name="add" size={14} className="rotate-45" />
        </Button>
      )}
    </div>
  );
}
