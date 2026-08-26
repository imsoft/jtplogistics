import { NextRequest } from "next/server";
import { requireDeveloper } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { validateImageUpload } from "@/lib/upload-validation";

/** Fotos de evidencia de los mantenimientos. */
export async function POST(request: NextRequest) {
  try {
    await requireDeveloper();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const validation = await validateImageUpload(file);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const upload = await uploadToCloudinary(validation.dataUri, {
      folder: "Mantenimientos",
      resource_type: "image",
    });
    return Response.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[developer/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
