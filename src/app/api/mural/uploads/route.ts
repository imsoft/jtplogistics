import { NextRequest } from "next/server";
import { gateMural } from "@/lib/mural-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { validateImageUpload } from "@/lib/upload-validation";

/** Subida de portadas e imágenes del mural (RH). */
export async function POST(request: NextRequest) {
  try {
    await gateMural("canCreateMural");

    const formData = await request.formData();
    const file = formData.get("file");
    const validation = await validateImageUpload(file);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const upload = await uploadToCloudinary(validation.dataUri, { folder: "Mural", resource_type: "image" });

    return Response.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[mural/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
