import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

/**
 * Lista de transportistas (usuarios con rol carrier) para el selector "Proveedor"
 * del formulario de embarques en el panel del colaborador. Devuelve la misma forma
 * mínima que consume `carrierProviderSelectOptions`. Gateado por canViewShipments.
 */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewShipments: true },
    });
    if (!me?.canViewShipments) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const carriers = await prisma.user.findMany({
      where: { role: "carrier" },
      orderBy: { createdAt: "desc" },
      include: { profile: { select: { commercialName: true, legalName: true } } },
    });

    return Response.json(
      carriers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profile: u.profile
          ? { commercialName: u.profile.commercialName, legalName: u.profile.legalName }
          : null,
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
