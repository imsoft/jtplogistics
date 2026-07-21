import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();

    // Verificar que el usuario tiene permisos para ver proveedores
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewProviders: true },
    });

    if (!user?.canViewProviders) {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    // Retornar solo usuarios con rol "carrier" (proveedores)
    const users = await prisma.user.findMany({
      where: { role: "carrier" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(users);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener usuarios:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
