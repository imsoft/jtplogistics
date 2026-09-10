import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { workDateKey } from "@/lib/time-clock";

/** Cuántas jornadas hacia atrás muestra el historial propio. */
const DEFAULT_DAYS = 30;

/**
 * GET /api/time-clock/me?days=30
 *
 * El historial del propio colaborador, agrupado por jornada. Solo lectura:
 * nadie edita sus propias checadas, ni siquiera dirección desde aquí.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();

    const url = new URL(request.url);
    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || DEFAULT_DAYS, 1), 90);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const entries = await prisma.timeClockEntry.findMany({
      where: { userId: session.user.id, workDate: { gte: since } },
      orderBy: [{ workDate: "desc" }, { markedAt: "asc" }],
      select: {
        id: true,
        mark: true,
        markedAt: true,
        workDate: true,
        distanceM: true,
        geoStatus: true,
        reason: true,
      },
    });

    // Agrupadas por jornada para que la pantalla no tenga que reordenar nada.
    const byDay = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = workDateKey(e.workDate);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(e);
      else byDay.set(key, [e]);
    }

    return Response.json({
      days: [...byDay.entries()].map(([workDate, marks]) => ({
        workDate,
        marks: marks.map((m) => ({
          id: m.id,
          mark: m.mark,
          markedAt: m.markedAt.toISOString(),
          distanceM: m.distanceM,
          geoStatus: m.geoStatus,
          reason: m.reason,
        })),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock/me] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
