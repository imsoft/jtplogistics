import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    // Verificar que el usuario tiene permisos para ver proveedores
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewProviders: true },
    });

    if (!currentUser?.canViewProviders) {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    // Obtener el usuario solo si es carrier (proveedor)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user || user.role !== "carrier") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    return Response.json(user);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener usuario:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
