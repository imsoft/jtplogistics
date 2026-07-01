import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Subida genérica de imágenes (equipos: laptops, teléfonos, etc.).
 * Devuelve { url, publicId } para guardarlos junto al recurso.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderParam = formData.get("folder");
    const folder = typeof folderParam === "string" && folderParam ? folderParam : "Devices";

    if (!file || !(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Se requiere un archivo de imagen." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const upload = await uploadToCloudinary(base64, { folder, resource_type: "image" });

    return Response.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
