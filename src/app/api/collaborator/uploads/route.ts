import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { validateImageUpload } from "@/lib/upload-validation";

/**
 * Subida genérica de imágenes para colaboradores (equipos: laptops, teléfonos).
 * Requiere permiso de creación o edición de laptops/teléfonos.
 * Devuelve { url, publicId }.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        canCreateLaptops: true,
        canUpdateLaptops: true,
        canCreatePhones: true,
        canUpdatePhones: true,
      },
    });

    const canUpload =
      me?.canCreateLaptops || me?.canUpdateLaptops || me?.canCreatePhones || me?.canUpdatePhones;
    if (!canUpload) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
    console.error("[collaborator/uploads]", message);
    return Response.json({ error: `Error al subir la imagen: ${message}` }, { status: 500 });
  }
}
