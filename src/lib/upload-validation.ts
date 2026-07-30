/**
 * Validación de las imágenes que se suben a Cloudinary.
 *
 * Sin esto, cualquiera con permiso de subida puede mandar un archivo de
 * cientos de MB (se carga completo en memoria antes de subirlo) o un SVG,
 * que los navegadores ejecutan como documento y puede llevar scripts.
 */

/** Tipos permitidos. SVG queda fuera a propósito: puede contener JavaScript. */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Firmas de archivo (magic bytes) para no confiar solo en el MIME declarado. */
const MAGIC_BYTES: Array<{ mime: string; check: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { mime: "image/gif", check: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  {
    mime: "image/webp",
    check: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    // AVIF y demás derivados de ISO-BMFF llevan "ftyp" en el byte 4.
    mime: "image/avif",
    check: (b) => b.subarray(4, 8).toString("ascii") === "ftyp",
  },
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export type UploadValidationResult =
  | { ok: true; buffer: Buffer; dataUri: string }
  | { ok: false; error: string; status: number };

/**
 * Comprueba que `file` sea una imagen admitida y que no exceda el tamaño
 * máximo. Devuelve el buffer y el data URI listos para Cloudinary.
 */
export async function validateImageUpload(
  file: unknown
): Promise<UploadValidationResult> {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Se requiere un archivo de imagen.", status: 400 };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);
    return {
      ok: false,
      error: `La imagen no puede pesar más de ${mb} MB.`,
      status: 413,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: "Formato no permitido. Usa JPG, PNG, WEBP, GIF o AVIF.",
      status: 415,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // El MIME lo manda el cliente y se puede falsear, así que además se revisa
  // que los primeros bytes correspondan de verdad a una imagen.
  const looksLikeImage = MAGIC_BYTES.some(({ check }) => check(buffer));
  if (!looksLikeImage) {
    return {
      ok: false,
      error: "El archivo no parece ser una imagen válida.",
      status: 415,
    };
  }

  return {
    ok: true,
    buffer,
    dataUri: `data:${file.type};base64,${buffer.toString("base64")}`,
  };
}
