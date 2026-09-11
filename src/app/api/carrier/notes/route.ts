import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireCarrierAccount } from "@/lib/carrier-account";

const DEFAULT_NOTES = "- Estadías\n- Reparto";

/**
 * Las notas de servicios son de la empresa: se leen y guardan sobre el usuario
 * principal, aunque las toque uno de sus usuarios.
 */
export async function GET() {
  try {
    const { carrierId } = await requireCarrierAccount();
    const company = await prisma.user.findUnique({
      where: { id: carrierId },
      select: { carrierNotes: true },
    });
    return Response.json({ notes: company?.carrierNotes ?? DEFAULT_NOTES });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { carrierId, userId, session } = await requireCarrierAccount("editCompany");
    const { notes } = (await request.json()) as { notes: string };
    const prev = await prisma.user.findUnique({
      where: { id: carrierId },
      select: { carrierNotes: true, name: true },
    });
    await prisma.user.update({
      where: { id: carrierId },
      data: { carrierNotes: notes ?? null },
    });
    if ((prev?.carrierNotes ?? "") !== (notes ?? "")) {
      void logAudit({
        resource: "profile",
        resourceId: carrierId,
        resourceLabel: prev?.name ?? session.user.name,
        action: "updated",
        // Quien lo cambió de verdad, que puede no ser el principal.
        userId,
        userName: session.user.name,
        changes: [
          { field: "carrierNotes", label: "Notas de servicios", from: prev?.carrierNotes ?? null, to: notes || null },
        ],
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
