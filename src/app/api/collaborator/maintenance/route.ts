import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

/**
 * Bitácora de mantenimientos en solo lectura, para quien lleva la
 * certificación. Programarlos y cerrarlos sigue siendo cosa de soporte TI.
 */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canViewMaintenance: true },
      });
      if (!me?.canViewMaintenance) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const maintenances = await prisma.maintenance.findMany({
      orderBy: [{ scheduledFor: "desc" }],
      include: {
        laptop: { select: { id: true, name: true, equipmentCode: true, serialNumber: true, assignedTo: { select: { name: true } } } },
        phone: { select: { id: true, name: true, equipmentCode: true, serialNumber: true, assignedTo: { select: { name: true } } } },
        technician: { select: { id: true, name: true } },
        ticket: { select: { id: true, title: true } },
      },
    });

    return Response.json(maintenances);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[collaborator/maintenance] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
