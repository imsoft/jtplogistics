import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateProviders } from "@/lib/provider-auth";
import { logAudit } from "@/lib/audit-log";

// PATCH — días de pago del transportista: con ellos vence su cuenta por pagar.
// body: { paymentDays: number | "" | null }  (vacío = 30 días)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await gateProviders("canUpdateProviders");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { paymentDays?: unknown };
    const raw = body.paymentDays === null || body.paymentDays === undefined ? "" : String(body.paymentDays).trim();
    const paymentDays = raw === "" ? null : Number(raw);
    if (paymentDays !== null && !(Number.isInteger(paymentDays) && paymentDays >= 0 && paymentDays <= 365)) {
      return Response.json({ error: "Los días de pago deben ser un número entero de 0 a 365." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, parentCarrierId: true, carrierPaymentDays: true, name: true } });
    if (!target || target.role !== "carrier") return Response.json({ error: "Solo aplicable a proveedores." }, { status: 403 });
    if (target.parentCarrierId) {
      return Response.json({ error: "Este usuario pertenece a un proveedor. Los días de pago van en la ficha de la empresa." }, { status: 409 });
    }

    await prisma.user.update({ where: { id }, data: { carrierPaymentDays: paymentDays } });
    void logAudit({
      resource: "user_setting",
      resourceId: id,
      resourceLabel: `Días de pago · ${target.name}`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "carrierPaymentDays", label: "Días de pago", from: target.carrierPaymentDays?.toString() ?? null, to: paymentDays?.toString() ?? null }],
    });
    return Response.json({ ok: true, paymentDays });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
