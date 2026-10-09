import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { applyPasswordReset, generatePassword } from "@/lib/password-reset";
import { canOffboard, validateOffboard } from "@/lib/offboarding";

/** Quien pregunta, solo si puede dar de baja; si no, 403. */
async function requireOffboarder() {
  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, canDeleteEmployees: true },
  });
  if (!me || !canOffboard(me)) {
    throw Response.json({ error: "No tienes permiso para dar de baja colaboradores." }, { status: 403 });
  }
  return me;
}

async function loadTarget(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, offboardedOn: true },
  });
  return u && u.role === "collaborator" ? u : null;
}

/**
 * POST /api/employees/[id]/offboard
 * body: { date: "YYYY-MM-DD", reason: string }
 *
 * Da de baja sin borrar: la persona se queda con su expediente y sus checadas,
 * pero pierde la contraseña y las sesiones, que es lo que la deja fuera.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireOffboarder();
    const { id } = await params;
    const target = await loadTarget(id);
    if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { date?: unknown; reason?: unknown };
    const error = validateOffboard(body, {
      today: companyDateKey(new Date()),
      targetId: id,
      actorId: me.id,
      alreadyOffboarded: target.offboardedOn !== null,
    });
    if (error) return Response.json({ error }, { status: 400 });

    const date = body.date as string;
    const reason = (body.reason as string).trim();

    const [, , sessions] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          offboardedOn: new Date(`${date}T00:00:00.000Z`),
          offboardReason: reason,
          offboardedByName: me.name,
        },
      }),
      prisma.account.deleteMany({ where: { userId: id, providerId: "credential" } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    void logAudit({
      resource: "employee",
      resourceId: id,
      resourceLabel: target.name,
      action: "updated",
      userId: me.id,
      userName: me.name,
      changes: [{ field: "offboardedOn", label: "Baja", from: null, to: `${date}: ${reason}` }],
    });

    return Response.json({ ok: true, closedSessions: sessions.count, offboardedByName: me.name });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[employees/:id/offboard] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/[id]/offboard — reactiva a quien regresa.
 *
 * La baja le borró la contraseña, así que se le genera una temporal, que se
 * muestra una sola vez a quien lo reactiva. El motivo de la baja anterior queda
 * en la bitácora.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireOffboarder();
    const { id } = await params;
    const target = await loadTarget(id);
    if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (target.offboardedOn === null) {
      return Response.json({ error: "Esta persona no está dada de baja." }, { status: 409 });
    }

    await prisma.user.update({
      where: { id },
      data: { offboardedOn: null, offboardReason: null, offboardedByName: null },
    });
    const password = generatePassword();
    await applyPasswordReset(id, target.email, password);

    void logAudit({
      resource: "employee",
      resourceId: id,
      resourceLabel: target.name,
      action: "updated",
      userId: me.id,
      userName: me.name,
      changes: [
        { field: "offboardedOn", label: "Baja", from: target.offboardedOn.toISOString().slice(0, 10), to: "reactivado" },
      ],
    });

    return Response.json({ ok: true, password });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[employees/:id/offboard] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
