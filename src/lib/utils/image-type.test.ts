import { afterEach, describe, expect, it, vi } from "vitest";
import { imageTypeFromBytes, isValidImage, sniffImageType } from "./image-type";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const file = (bytes: number[], name = "a.png", type = "image/png") =>
  new File([Uint8Array.from(bytes)], name, { type });

describe("imageTypeFromBytes (VES-101)", () => {
  it("recognises JPG, PNG and WebP by their signature", () => {
    expect(imageTypeFromBytes(Uint8Array.from(JPEG))).toBe("image/jpeg");
    expect(imageTypeFromBytes(Uint8Array.from(PNG))).toBe("image/png");
    expect(imageTypeFromBytes(Uint8Array.from(WEBP))).toBe("image/webp");
  });

  it("rejects text, a truncated signature and RIFF files that aren't WebP", () => {
    expect(imageTypeFromBytes(new TextEncoder().encode("não sou imagem"))).toBeNull();
    expect(imageTypeFromBytes(Uint8Array.from([0x89, 0x50, 0x4e]))).toBeNull();
    const wav = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
    expect(imageTypeFromBytes(Uint8Array.from(wav))).toBeNull();
    expect(imageTypeFromBytes(new Uint8Array())).toBeNull();
  });
});

describe("sniffImageType / isValidImage (VES-101)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("goes by the bytes, not the file's type", async () => {
    const text = new File(["só texto"], "foto.png", { type: "image/png" });
    expect(await sniffImageType(text)).toBeNull();
    expect(await isValidImage(text)).toBe(false);
    expect(await sniffImageType(file(JPEG, "foto.png", "image/png"))).toBe("image/jpeg");
  });

  it("accepts a valid signature where the browser can't decode (jsdom, server)", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    expect(await isValidImage(file(PNG))).toBe(true);
  });

  it("rejects a file the browser fails to decode, even with a valid signature", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode")));
    expect(await isValidImage(file(PNG))).toBe(false);
  });

  it("accepts a file the browser decodes", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close }));
    expect(await isValidImage(file(WEBP, "a.webp", "image/webp"))).toBe(true);
    expect(close).toHaveBeenCalled();
  });
});
