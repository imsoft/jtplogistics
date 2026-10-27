import { NextRequest } from "next/server";
import { validateImageUpload } from "@/lib/upload-validation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const formData = await request.formData();
    // Tipo y tamaño revisados por contenido, no por lo que dice el navegador.
    const validation = await validateImageUpload(formData.get("file"));
    if (!validation.ok) return Response.json({ error: validation.error }, { status: validation.status });
    const base64 = validation.dataUri;

    const upload = await uploadToCloudinary(base64, {
      folder: "settings",
      resource_type: "image",
      public_id: "cover_image",
    });

    await prisma.setting.upsert({
      where: { key: "cover_image_url" },
      create: { key: "cover_image_url", value: upload.secure_url },
      update: { value: upload.secure_url },
    });

    void logAudit({
      resource: "settings",
      resourceId: "cover_image",
      resourceLabel: "Imagen de portada",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ url: upload.secure_url });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[settings/cover-image]", message);
    return Response.json(
      { error: `Error al subir la imagen: ${message}` },
      { status: 500 },
    );
  }
}
