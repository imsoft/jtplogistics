import { prisma } from "@/lib/db";
import { permissionHandler } from "@/lib/api-handler";
import { companyDateKey, workDateFromKey, workDateKey } from "@/lib/time-clock";

/**
 * GET /api/time-clock/log?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=…
 *
 * El registro de TODOS, para RH y dirección. Sin banderas ni retardos: la
 * fase 1 solo enseña lo que se marcó. Por defecto, la jornada de hoy.
 */
export function GET(request: Request) {
  return permissionHandler("canViewTimeClock", async () => {
    const url = new URL(request.url);
    const today = companyDateKey();
    const from = workDateFromKey(url.searchParams.get("from") || today);
    const to = workDateFromKey(url.searchParams.get("to") || url.searchParams.get("from") || today);
    const userId = url.searchParams.get("userId");

    const entries = await prisma.timeClockEntry.findMany({
      where: {
        workDate: { gte: from, lte: to },
        ...(userId ? { userId } : {}),
      },
      orderBy: [{ workDate: "desc" }, { userId: "asc" }, { markedAt: "asc" }],
      select: {
        id: true,
        mark: true,
        markedAt: true,
        workDate: true,
        distanceM: true,
        geoStatus: true,
        ipAddress: true,
        deviceId: true,
        reason: true,
        user: { select: { id: true, name: true } },
      },
    });

    // Una fila por colaborador y jornada, con sus cuatro marcas.
    const rows = new Map<
      string,
      {
        workDate: string;
        userId: string;
        userName: string;
        marks: Record<string, { at: string; distanceM: number | null; geoStatus: string | null }>;
        ips: string[];
        devices: string[];
        reasons: string[];
      }
    >();

    for (const e of entries) {
      const workDate = workDateKey(e.workDate);
      const key = `${workDate}|${e.user.id}`;
      let row = rows.get(key);
      if (!row) {
        row = {
          workDate,
          userId: e.user.id,
          userName: e.user.name,
          marks: {},
          ips: [],
          devices: [],
          reasons: [],
        };
        rows.set(key, row);
      }
      row.marks[e.mark] = {
        at: e.markedAt.toISOString(),
        distanceM: e.distanceM,
        geoStatus: e.geoStatus,
      };
      if (e.ipAddress && !row.ips.includes(e.ipAddress)) row.ips.push(e.ipAddress);
      if (e.deviceId && !row.devices.includes(e.deviceId)) row.devices.push(e.deviceId);
      if (e.reason) row.reasons.push(e.reason);
    }

    return Response.json({ rows: [...rows.values()] });
  });
}
