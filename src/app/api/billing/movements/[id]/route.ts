import { prisma } from "@/lib/db";
import { failure, requireBilling } from "@/lib/billing-server";

/** PATCH /api/billing/movements/[id] — marcar o desmarcar como conciliado. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("update");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.reconciled !== "boolean") return Response.json({ error: "Falta el estado." }, { status: 400 });
    const m = await prisma.bankMovement.findUnique({ where: { id }, select: { id: true } });
    if (!m) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.bankMovement.update({ where: { id }, data: { reconciled: body.reconciled } });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "movement PATCH");
  }
}

/** DELETE — solo los capturados a mano; los de cobros, pagos y gastos se quitan desde su origen. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("delete");
    const { id } = await params;
    const m = await prisma.bankMovement.findUnique({ where: { id } });
    if (!m) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (m.paymentId || m.expenseId) {
      return Response.json({ error: "Este movimiento viene de un cobro, pago o gasto: bórralo desde ahí." }, { status: 400 });
    }
    await prisma.bankMovement.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "movement DELETE");
  }
}
