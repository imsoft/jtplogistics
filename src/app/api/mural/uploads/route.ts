import { NextRequest } from "next/server";
import { gateMural } from "@/lib/mural-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

/** Subida de portadas e imágenes del mural (RH). */
export async function POST(request: NextRequest) {
  try {
    await gateMural("canCreateMural");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Se requiere un archivo de imagen." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const upload = await uploadToCloudinary(base64, { folder: "Mural", resource_type: "image" });

    return Response.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[mural/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
