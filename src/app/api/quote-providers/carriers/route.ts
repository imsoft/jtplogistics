import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { carrierPrimaryLabel } from "@/lib/carrier-provider-options";

/** GET /api/quote-providers/carriers — proveedores dados de alta, para buscarlos al cotizar. */
export async function GET() {
  try {
    await requireCollaboratorOrAdmin();
    const carriers = await prisma.user.findMany({
      where: { role: "carrier", parentCarrierId: null },
      include: { profile: { select: { commercialName: true, legalName: true } } },
    });
    return Response.json(
      carriers
        .map((c) => ({ id: c.id, label: carrierPrimaryLabel(c as never), legalName: c.profile?.legalName ?? null }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quote-providers/carriers] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
