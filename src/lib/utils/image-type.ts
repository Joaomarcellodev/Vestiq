/**
 * VES-101 — confere se um arquivo é mesmo uma imagem JPG, PNG ou WebP.
 *
 * O `type` de um `File` vem só da extensão: um texto renomeado para `.png`
 * passa por ele e vira uma miniatura quebrada. Aqui vale a assinatura dos
 * primeiros bytes (funciona no servidor e no navegador) e, onde houver
 * `createImageBitmap`, a decodificação de fato — uma assinatura certa com o
 * resto corrompido também é recusada.
 */

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

const startsWith = (bytes: Uint8Array, sig: number[], at = 0) =>
  sig.every((b, i) => bytes[at + i] === b);

/** O tipo indicado pela assinatura dos bytes, ou `null` se não for JPG, PNG ou WebP. */
export function imageTypeFromBytes(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" <tamanho> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

/** Lê o começo do arquivo e devolve o tipo pela assinatura. */
export async function sniffImageType(file: Blob): Promise<ImageType | null> {
  return imageTypeFromBytes(new Uint8Array(await readBytes(file.slice(0, 12))));
}

/** `Blob.arrayBuffer`, com `FileReader` onde ele não existe (o jsdom dos testes). */
function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** Assinatura de JPG, PNG ou WebP e, no navegador, decodificável. */
export async function isValidImage(file: Blob): Promise<boolean> {
  if (!(await sniffImageType(file))) return false;
  if (typeof createImageBitmap !== "function") return true;
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close?.();
    return true;
  } catch {
    return false;
  }
}
