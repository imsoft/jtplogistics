import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

/** Quién captura horarios: dirección por su rol, RH por su permiso. */
async function requireScheduleManager() {
  const session = await requireSession();
  const { role, id } = session.user;

  if (role !== "admin" && role !== "developer") {
    const me =
      role === "collaborator"
        ? await prisma.user.findUnique({
            where: { id },
            select: { canManageSchedules: true },
          })
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

/**
 * GET /api/time-clock/schedules
 *   · sin userId → todos los colaboradores con su horario
 *   · con userId → solo ese
 */
export async function GET(request: Request) {
  try {
    await requireScheduleManager();
    const userId = new URL(request.url).searchParams.get("userId");

    const users = await prisma.user.findMany({
      where: { role: "collaborator", ...(userId ? { id: userId } : {}) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        employeeProfile: { select: { position: true } },
        workSchedules: {
          orderBy: { weekday: "asc" },
          select: { weekday: true, startMinute: true, endMinute: true },
        },
      },
    });

    return Response.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        position: u.employeeProfile?.position ?? null,
        days: u.workSchedules,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/schedules] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PUT /api/time-clock/schedules
 * body: { userId, days: [{ weekday, startMinute, endMinute }] }
 *
 * Reemplaza el horario completo del colaborador. Los días que no vengan en la
 * lista se borran, que es como se dice "ese día no labora".
 */
export async function PUT(request: Request) {
  try {
    await requireScheduleManager();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      days?: { weekday: number; startMinute: number; endMinute: number }[];
    };

    if (!body.userId) {
      return Response.json({ error: "Falta el colaborador." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { role: true },
    });
    if (!target || target.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const days = (body.days ?? []).filter(
      (d) =>
        Number.isInteger(d.weekday) &&
        d.weekday >= 0 &&
        d.weekday <= 6 &&
        Number.isInteger(d.startMinute) &&
        Number.isInteger(d.endMinute) &&
        d.startMinute >= 0 &&
        d.startMinute < 1440 &&
        d.endMinute >= 0 &&
        d.endMinute < 1440
    );

    // Borrar y reescribir: son siete renglones, no vale la pena diferenciar.
    await prisma.$transaction([
      prisma.workSchedule.deleteMany({ where: { userId: body.userId } }),
      ...days.map((d) =>
        prisma.workSchedule.create({
          data: {
            userId: body.userId!,
            weekday: d.weekday,
            startMinute: d.startMinute,
            endMinute: d.endMinute,
          },
        })
      ),
    ]);

    return Response.json({ ok: true, days: days.length });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/schedules] PUT", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
