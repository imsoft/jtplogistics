import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { r2 } from "@/lib/billing";
import { failure, num, requireBilling, toDate } from "@/lib/billing-server";

/**
 * POST /api/billing/banks/[id]/movements — movimiento capturado a mano:
 * comisiones, intereses, traspasos, depósitos sin factura. `direction`
 * "in" entra a la cuenta, "out" sale.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("create");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    const amount = r2(num(body.amount));
    const concept = typeof body.concept === "string" ? body.concept.trim() : "";
    if (!date) return Response.json({ error: "Elige la fecha." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "El monto debe ser mayor a cero." }, { status: 400 });
    if (concept.length < 3) return Response.json({ error: "Escribe el concepto." }, { status: 400 });
    const m = await prisma.bankMovement.create({
      data: {
        bankAccountId: id,
        date: toDate(date),
        amount: String(body.direction ?? "").toLowerCase() === "out" ? -amount : amount,
        concept,
        reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
        createdById: session.user.id,
      },
      select: { id: true },
    });
    void logAudit({ resource: "bank_account", resourceId: id, resourceLabel: account.name, action: "updated", userId: session.user.id, userName: session.user.name, changes: [{ field: "movement", label: "Movimiento", from: null, to: `${String(body.direction ?? "").toLowerCase() === "out" ? "-" : "+"}${amount.toFixed(2)} · ${concept}` }] });
    return Response.json({ id: m.id }, { status: 201 });
  } catch (e) {
    return failure(e, "movement POST");
  }
}
