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
            contacts: {
              orderBy: { createdAt: "asc" },
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
        carrierRoutes: {
          include: { route: true },
          orderBy: { createdAt: "asc" },
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
      emailVerified: false,
      image: user.image,
      profile: user.profile
        ? {
            commercialName: user.profile.commercialName,
            legalName: user.profile.legalName,
            rfc: user.profile.rfc,
            address: user.profile.address,
            contacts: user.profile.contacts,
          }
        : null,
      role: user.role,
      carrierNotes: user.carrierNotes,
      canEditRoutes: user.canEditRoutes,
      canEditTarget: user.canEditTarget,
      canAddRoutes: user.canAddRoutes,
      carrierRoutes: user.carrierRoutes.map((cr) => ({
        id: cr.id,
        unitType: cr.unitType,
        carrierTarget: cr.carrierTarget,
        terms: cr.terms,
        editUnlockRequested: cr.editUnlockRequested,
        editUnlockApproved: cr.editUnlockApproved,
        route: {
          origin: cr.route.origin,
          destination: cr.route.destination,
          description: cr.route.description,
          target: cr.route.target,
        },
      })),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener usuario:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
