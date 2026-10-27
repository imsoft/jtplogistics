import { NextRequest } from "next/server";
import { validateImageUpload } from "@/lib/upload-validation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logAudit } from "@/lib/audit-log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    // Tipo y tamaño revisados por contenido, no por lo que dice el navegador.
    const validation = await validateImageUpload(formData.get("file"));
    if (!validation.ok) return Response.json({ error: validation.error }, { status: validation.status });
    const base64 = validation.dataUri;

    const safeName = (u.name ?? "user").replace(/[^a-zA-Z0-9]/g, "");
    const folder = `Profile Pictures/${safeName}${id}`;

    const upload = await uploadToCloudinary(base64, {
      folder,
      resource_type: "image",
    });

    await prisma.user.update({
      where: { id },
      data: { image: upload.secure_url },
    });

    void logAudit({
      resource: "vendor", resourceId: id, resourceLabel: u.name ?? "",
      action: "updated", userId: session.user.id, userName: session.user.name,
      changes: [{ field: "image", label: "Foto de perfil", from: null, to: "Actualizada" }],
    });

    return Response.json({ url: upload.secure_url });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[vendors/avatar]", message);
    return Response.json({ error: "No se pudo subir la imagen. Intenta de nuevo." }, { status: 500 });
  }
}
