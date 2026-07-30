import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { validateImageUpload } from "@/lib/upload-validation";

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
    const validation = await validateImageUpload(file);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const upload = await uploadToCloudinary(validation.dataUri, { folder, resource_type: "image" });

    return Response.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
