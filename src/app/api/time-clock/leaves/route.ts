import type { LeaveKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { workDateFromKey, workDateKey } from "@/lib/time-clock";
import { LEAVE_LABELS, rangesOverlap } from "@/lib/time-clock-leaves";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: LeaveKind[] = ["vacaciones", "home_office", "incapacidad", "permiso"];

/** Lo programa quien captura horarios: RH, además de dirección y soporte TI. */
async function requireScheduleManager() {
  const session = await requireSession();
  const { role, id } = session.user;

  if (role !== "admin" && role !== "developer") {
    const me =
      role === "collaborator"
        ? await prisma.user.findUnique({ where: { id }, select: { canManageSchedules: true } })
        : null;
    if (!me?.canManageSchedules) {
      throw new Response(JSON.stringify({ error: "Sin permiso" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return session;
}

/** GET /api/time-clock/leaves?userId=… — los periodos de ese colaborador. */
export async function GET(request: Request) {
  try {
    await requireScheduleManager();
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    if (!userId) return Response.json({ error: "Falta el colaborador." }, { status: 400 });

    const leaves = await prisma.timeClockLeave.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        kind: true,
        startDate: true,
        endDate: true,
        note: true,
        createdBy: { select: { name: true } },
      },
    });

    return Response.json({
      leaves: leaves.map((l) => ({
        id: l.id,
        kind: l.kind,
        startDate: workDateKey(l.startDate),
        endDate: workDateKey(l.endDate),
        note: l.note,
        createdByName: l.createdBy?.name ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/leaves] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/time-clock/leaves
 * body: { userId, kind, startDate, endDate, note? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireScheduleManager();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const userId = typeof body.userId === "string" ? body.userId : "";
    const kind = body.kind as LeaveKind;
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!userId || !KINDS.includes(kind)) {
      return Response.json({ error: "Faltan datos del periodo." }, { status: 400 });
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return Response.json({ error: "Elige las dos fechas." }, { status: 400 });
    }
    if (endDate < startDate) {
      return Response.json(
        { error: "La fecha final no puede ser anterior a la inicial." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });
    if (!target || target.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    // Dos periodos encimados dejarían la jornada dependiendo de cuál se leyera
    // primero; mejor impedirlo al capturar.
    const existing = await prisma.timeClockLeave.findMany({
      where: { userId },
      select: { id: true, kind: true, startDate: true, endDate: true },
    });
    const clash = existing.find((l) =>
      rangesOverlap(startDate, endDate, workDateKey(l.startDate), workDateKey(l.endDate))
    );
    if (clash) {
      return Response.json(
        {
          error: `Ya tiene ${LEAVE_LABELS[clash.kind]} del ${workDateKey(clash.startDate)} al ${workDateKey(clash.endDate)}. Quita ese periodo primero.`,
        },
        { status: 409 }
      );
    }

    const created = await prisma.timeClockLeave.create({
      data: {
        userId,
        kind,
        startDate: workDateFromKey(startDate),
        endDate: workDateFromKey(endDate),
        note: note || null,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    void logAudit({
      resource: "time_clock_leave",
      resourceId: created.id,
      resourceLabel: target.name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "leave",
          label: LEAVE_LABELS[kind],
          from: null,
          to: `${startDate} al ${endDate}${note ? ` — ${note}` : ""}`,
        },
      ],
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/leaves] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** DELETE /api/time-clock/leaves?id=… */
export async function DELETE(request: Request) {
  try {
    const session = await requireScheduleManager();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const leave = await prisma.timeClockLeave.findUnique({
      where: { id },
      select: { kind: true, startDate: true, endDate: true, user: { select: { name: true } } },
    });
    if (!leave) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.timeClockLeave.delete({ where: { id } });

    void logAudit({
      resource: "time_clock_leave",
      resourceId: id,
      resourceLabel: leave.user.name,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "leave",
          label: LEAVE_LABELS[leave.kind],
          from: `${workDateKey(leave.startDate)} al ${workDateKey(leave.endDate)}`,
          to: null,
        },
      ],
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/leaves] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
