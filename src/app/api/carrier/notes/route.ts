import { prisma } from "@/lib/db";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { DEFAULT_CARRIER_NOTES, JTP_MANAGES_COMPANY } from "@/lib/carrier-company-server";

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
    return Response.json({ notes: company?.carrierNotes ?? DEFAULT_CARRIER_NOTES });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

/** PATCH — el proveedor ya no cambia sus notas: las administra JTP (ver /api/admin/carriers/[id]/company). */
export async function PATCH() {
  try {
    await requireCarrierAccount();
    return Response.json({ error: JTP_MANAGES_COMPANY }, { status: 403 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
