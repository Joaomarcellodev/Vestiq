/**
 * Redimensiona e recomprime imagens no navegador antes do envio.
 *
 * O corpo de um Server Action tem teto (`serverActions.bodySizeLimit` em
 * `next.config.ts`) e uploads multipart passam pelo mesmo controle — uma foto
 * de celular (2–5 MB) falharia antes de chegar na validação do app. Fora do
 * navegador, ou em qualquer ambiente sem canvas (o jsdom dos testes), as
 * funções devolvem o arquivo original em vez de quebrar.
 */

export interface CompressOptions {
  /** Maior dimensão (px) da imagem resultante. */
  maxDim: number;
  /** Alvo de tamanho em bytes: a qualidade cai por etapas até chegar perto. */
  maxBytes: number;
}

export const AVATAR_COMPRESSION: CompressOptions = { maxDim: 512, maxBytes: 300 * 1024 };
export const PRODUCT_COMPRESSION: CompressOptions = { maxDim: 1600, maxBytes: 700 * 1024 };

const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];

export async function compressImage(file: File, opts: CompressOptions): Promise<File> {
  if (!canCompress()) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, opts.maxDim / Math.max(bitmap.width, bitmap.height));

    // Já cabe nos dois critérios: reprocessar só perderia qualidade.
    if (scale === 1 && file.size <= opts.maxBytes) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    // WebP preserva transparência e rende bem melhor que JPEG no mesmo peso.
    const type = supportsWebp() ? "image/webp" : "image/jpeg";
    let best: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, type, quality);
      if (!blob) break;
      best = blob;
      if (blob.size <= opts.maxBytes) break;
    }

    if (!best || best.size >= file.size) return file;
    return new File([best], renamed(file.name, type), { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function compressImages(files: File[], opts: CompressOptions): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, opts)));
}

function canCompress(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.toBlob === "function"
  );
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

let webpSupport: boolean | null = null;

function supportsWebp(): boolean {
  if (webpSupport === null) {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    webpSupport = probe.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupport;
}

function renamed(name: string, type: string): string {
  const ext = type === "image/webp" ? "webp" : "jpg";
  const base = name.replace(/\.[^.]+$/, "") || "imagem";
  return `${base}.${ext}`;
}
