import { describe, it, expect } from "vitest";
import { validateImageUpload, MAX_UPLOAD_BYTES } from "@/lib/upload-validation";

/** Construye un File con los magic bytes del formato indicado. */
function fakeFile(
  type: string,
  magic: number[],
  { size = 1024, name = "x" }: { size?: number; name?: string } = {}
): File {
  const bytes = new Uint8Array(Math.max(size, magic.length));
  bytes.set(magic, 0);
  return new File([bytes], name, { type });
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46];

describe("validateImageUpload", () => {
  it("acepta un PNG válido", async () => {
    const result = await validateImageUpload(fakeFile("image/png", PNG));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dataUri.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("acepta JPEG y GIF", async () => {
    expect((await validateImageUpload(fakeFile("image/jpeg", JPEG))).ok).toBe(true);
    expect((await validateImageUpload(fakeFile("image/gif", GIF))).ok).toBe(true);
  });

  it("rechaza si no hay archivo", async () => {
    const result = await validateImageUpload(null);
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rechaza un archivo vacío", async () => {
    const result = await validateImageUpload(new File([], "v.png", { type: "image/png" }));
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rechaza SVG aunque sea una imagen (puede llevar scripts)", async () => {
    const svg = new File(["<svg onload='alert(1)'></svg>"], "x.svg", {
      type: "image/svg+xml",
    });
    const result = await validateImageUpload(svg);
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("rechaza tipos no permitidos", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "x.pdf", {
      type: "application/pdf",
    });
    expect(await validateImageUpload(pdf)).toMatchObject({ ok: false, status: 415 });
  });

  it("rechaza un archivo que excede el tamaño máximo", async () => {
    const big = fakeFile("image/png", PNG, { size: MAX_UPLOAD_BYTES + 1 });
    const result = await validateImageUpload(big);
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it("rechaza un ejecutable disfrazado de PNG por el MIME", async () => {
    // MIME permitido, pero el contenido no es una imagen: los magic bytes lo delatan.
    const fake = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], "x.png", {
      type: "image/png",
    });
    const result = await validateImageUpload(fake);
    expect(result).toMatchObject({ ok: false, status: 415 });
  });
});
