import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET(_req: NextRequest) {
  try {
    const session = await requireCollaboratorOrAdmin();

    // Verificar que el usuario tiene permisos para ver proveedores
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewProviders: true },
    });

    if (!user?.canViewProviders) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    // Retornar solo usuarios con rol "carrier" (proveedores)
    const users = await prisma.user.findMany({
      where: { role: "carrier" },
      include: {
        profile: {
          select: {
            commercialName: true,
            legalName: true,
            rfc: true,
            address: true,
            contacts: {
              select: {
                id: true,
                type: true,
                value: true,
                label: true,
                personName: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        commercialName: u.profile?.commercialName,
        legalName: u.profile?.legalName,
        rfc: u.profile?.rfc,
        address: u.profile?.address,
        contacts: u.profile?.contacts ?? [],
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener usuarios:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
