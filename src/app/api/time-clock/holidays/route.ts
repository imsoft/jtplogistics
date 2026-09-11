import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { mexicanStatutoryHolidays } from "@/lib/holidays";
import { workDateFromKey, workDateKey } from "@/lib/time-clock";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Días festivos del checador. Todo aquí es solo de dirección: ni RH los
 * administra. Al marcar, el servidor los consulta por su cuenta.
 */

/** GET /api/time-clock/holidays?year=2026 */
export function GET(request: Request) {
  return adminHandler(async () => {
    const year = Number(new URL(request.url).searchParams.get("year")) || new Date().getFullYear();
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: workDateFromKey(`${year}-01-01`), lte: workDateFromKey(`${year}-12-31`) } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, name: true },
    });
    return Response.json({
      holidays: holidays.map((h) => ({ id: h.id, date: workDateKey(h.date), name: h.name })),
    });
  });
}

/**
 * POST /api/time-clock/holidays
 *   { date, name }        → agrega uno
 *   { preloadYear: 2026 } → agrega los de la LFT de ese año que falten
 */
export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      name?: string;
      preloadYear?: number;
    };

    if (typeof body.preloadYear === "number") {
      const year = Math.trunc(body.preloadYear);
      if (year < 2000 || year > 2100) {
        return Response.json({ error: "Año fuera de rango." }, { status: 400 });
      }
      // skipDuplicates: si dirección ya había capturado alguno, no truena ni lo pisa.
      const { count } = await prisma.holiday.createMany({
        data: mexicanStatutoryHolidays(year).map((h) => ({
          date: workDateFromKey(h.date),
          name: h.name,
        })),
        skipDuplicates: true,
      });
      void logAudit({
        resource: "time_clock",
        resourceId: `holidays-${year}`,
        resourceLabel: `Festivos ${year}`,
        action: "created",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "holidays", label: "Festivos de la ley", from: null, to: `${count} agregados` }],
      });
      return Response.json({ added: count });
    }

    const date = body.date?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!DATE_RE.test(date)) {
      return Response.json({ error: "Elige una fecha válida." }, { status: 400 });
    }
    if (!name) {
      return Response.json({ error: "Ponle nombre al festivo." }, { status: 400 });
    }

    try {
      const created = await prisma.holiday.create({
        data: { date: workDateFromKey(date), name },
        select: { id: true },
      });
      void logAudit({
        resource: "time_clock",
        resourceId: created.id,
        resourceLabel: `Festivo ${date}`,
        action: "created",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "holiday", label: "Día festivo", from: null, to: `${date} — ${name}` }],
      });
      return Response.json({ id: created.id }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        return Response.json({ error: "Ese día ya está marcado como festivo." }, { status: 409 });
      }
      throw e;
    }
  });
}

/** DELETE /api/time-clock/holidays?id=… */
export function DELETE(request: Request) {
  return adminHandler(async (session) => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.holiday.delete({ where: { id } });
    void logAudit({
      resource: "time_clock",
      resourceId: id,
      resourceLabel: `Festivo ${workDateKey(holiday.date)}`,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        { field: "holiday", label: "Día festivo", from: `${workDateKey(holiday.date)} — ${holiday.name}`, to: null },
      ],
    });
    return Response.json({ ok: true });
  });
}
