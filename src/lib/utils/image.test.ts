import { afterEach, describe, expect, it, vi } from "vitest";

const OPTS = { maxDim: 512, maxBytes: 1000 };

/** O suporte a WebP fica em cache no módulo, então cada teste recarrega. */
async function loadModule() {
  vi.resetModules();
  return import("./image");
}

function file(size: number, name = "foto.jpg", type = "image/jpeg") {
  return new File([new Uint8Array(size)], name, { type });
}

function stubDecoder(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width, height, close })),
  );
  return close;
}

interface CanvasStub {
  /** Tamanho (bytes) devolvido por cada chamada de toBlob, em ordem. */
  sizes?: number[];
  webp?: boolean;
  context?: boolean;
}

function stubCanvas({ sizes = [500], webp = true, context = true }: CanvasStub = {}) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    (context ? { drawImage: vi.fn() } : null) as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    webp ? "data:image/webp;base64,AA" : "data:image/png;base64,AA",
  );

  const queue = [...sizes];
  const painted: HTMLCanvasElement[] = [];
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb,
    type,
  ) {
    painted.push(this);
    const size = queue.length > 1 ? queue.shift()! : queue[0]!;
    cb(new Blob([new Uint8Array(size)], { type }));
  });

  return { toBlob, painted };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("compressImage", () => {
  it("returns the original file where the browser cannot decode images", async () => {
    const { compressImage } = await loadModule();
    const original = file(5000);
    expect(await compressImage(original, OPTS)).toBe(original);
  });

  it("resizes to the longest side and re-encodes as webp", async () => {
    const close = stubDecoder(2000, 1000);
    const { painted } = stubCanvas({ sizes: [400] });
    const { compressImage } = await loadModule();

    const result = await compressImage(file(5000), OPTS);

    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("foto.webp");
    expect(result.size).toBe(400);
    expect(painted[0]!.width).toBe(512);
    expect(painted[0]!.height).toBe(256);
    expect(close).toHaveBeenCalled();
  });

  it("steps the quality down until the blob fits the target", async () => {
    stubDecoder(2000, 1000);
    const { toBlob } = stubCanvas({ sizes: [4000, 3000, 900] });
    const { compressImage } = await loadModule();

    const result = await compressImage(file(9000), OPTS);

    expect(result.size).toBe(900);
    expect(toBlob).toHaveBeenCalledTimes(3);
    const qualities = toBlob.mock.calls.map((c) => c[2]);
    expect(qualities[1]!).toBeLessThan(qualities[0]! as number);
  });

  it("keeps the original when re-encoding does not make it smaller", async () => {
    stubDecoder(2000, 1000);
    stubCanvas({ sizes: [9000] });
    const { compressImage } = await loadModule();

    const original = file(4000);
    expect(await compressImage(original, OPTS)).toBe(original);
  });

  it("skips the canvas when the image already fits both limits", async () => {
    stubDecoder(400, 300);
    const { toBlob } = stubCanvas();
    const { compressImage } = await loadModule();

    const original = file(500);
    expect(await compressImage(original, OPTS)).toBe(original);
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("falls back to jpeg when webp is not supported", async () => {
    stubDecoder(2000, 1000);
    stubCanvas({ sizes: [400], webp: false });
    const { compressImage } = await loadModule();

    const result = await compressImage(file(5000), OPTS);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("foto.jpg");
  });

  it("keeps the original when there is no 2d context", async () => {
    stubDecoder(2000, 1000);
    stubCanvas({ context: false });
    const { compressImage } = await loadModule();

    const original = file(5000);
    expect(await compressImage(original, OPTS)).toBe(original);
  });

  it("keeps the original when decoding throws", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("decode failed");
      }),
    );
    stubCanvas();
    const { compressImage } = await loadModule();

    const original = file(5000);
    expect(await compressImage(original, OPTS)).toBe(original);
  });
});

describe("compressImages", () => {
  it("processes every file in the list", async () => {
    stubDecoder(2000, 1000);
    stubCanvas({ sizes: [400] });
    const { compressImages } = await loadModule();

    const result = await compressImages([file(5000, "a.jpg"), file(5000, "b.png")], OPTS);
    expect(result.map((f) => f.name)).toEqual(["a.webp", "b.webp"]);
  });
});
