import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;

    // Verificar que el usuario tiene permisos para ver proveedores
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewProviders: true },
    });

    if (!currentUser?.canViewProviders) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    // Obtener el usuario solo si es carrier (proveedor)
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            commercialName: true,
            legalName: true,
            rfc: true,
            address: true,
          },
        },
      },
    });

    if (!user || user.role !== "carrier") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      commercialName: user.profile?.commercialName,
      legalName: user.profile?.legalName,
      rfc: user.profile?.rfc,
      address: user.profile?.address,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener usuario:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
