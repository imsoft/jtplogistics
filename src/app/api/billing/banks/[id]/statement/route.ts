import { prisma } from "@/lib/db";
import { failure, requireBilling, toDate } from "@/lib/billing-server";
import { matchStatement, readStatementLines } from "@/lib/bank-statement";
import { addDaysKey } from "@/lib/billing-reminders";

/**
 * POST /api/billing/banks/[id]/statement { lines } — vista previa: qué
 * renglones del banco ya están en la plataforma, cuáles faltan y qué
 * movimientos de la plataforma no aparecen en el banco. No cambia nada.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("view");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id }, select: { id: true } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const lines = readStatementLines(body.lines);
    if (!lines) return Response.json({ error: "El archivo no trae movimientos válidos." }, { status: 400 });

    const first = lines.reduce((m, l) => (l.date < m ? l.date : m), lines[0].date);
    const last = lines.reduce((m, l) => (l.date > m ? l.date : m), lines[0].date);
    const movements = await prisma.bankMovement.findMany({
      where: { bankAccountId: id, date: { gte: toDate(addDaysKey(first, -5)), lte: toDate(addDaysKey(last, 5)) } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { id: true, date: true, amount: true, concept: true, reference: true, reconciled: true },
    });
    const platform = movements.map((m) => ({ ...m, date: m.date.toISOString().slice(0, 10) }));
    const result = matchStatement(lines, platform);
    const byId = new Map(platform.map((m) => [m.id, m]));
    return Response.json({
      from: first,
      to: last,
      lines,
      matches: result.matches.map((m) => ({ ...m, movement: byId.get(m.movementId)! })),
      unmatchedLines: result.unmatchedLines,
      unmatchedMovements: result.unmatchedMovements.map((mid) => byId.get(mid)!),
    });
  } catch (e) {
    return failure(e, "statement preview");
  }
}
