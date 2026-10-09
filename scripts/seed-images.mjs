/**
 * Placeholder product photos for the seed — a fabric-like swatch in the
 * piece's colour (diagonal weave over a soft gradient), encoded as PNG with
 * no dependencies so the demo catalog isn't a wall of empty thumbnails.
 */
import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** `hex` like "#1f1f1f" → square PNG swatch (RGB, 8-bit). */
export function swatchPng(hex, size = 480) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const light = 1.12 - (y / size) * 0.24; // top a bit lighter
      const weave = (x + y) % 12 < 6 ? 1.04 : 0.96;
      const i = row + 1 + x * 3;
      raw[i] = clamp(r * light * weave + 18);
      raw[i + 1] = clamp(g * light * weave + 18);
      raw[i + 2] = clamp(b * light * weave + 18);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Colour names used by the seed catalog. */
export const COLOR_HEX = {
  Preto: "#1c1c1f",
  Branco: "#e9e5dc",
  Bege: "#c9b28f",
  Terracota: "#a4553a",
};
