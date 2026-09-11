import { prisma } from "@/lib/db";
import { permissionHandler } from "@/lib/api-handler";
import { companyDateKey, workDateFromKey, workDateKey } from "@/lib/time-clock";
import { effectiveMarks } from "@/lib/time-clock-corrections";

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

    const all = await prisma.timeClockEntry.findMany({
      where: {
        workDate: { gte: from, lte: to },
        ...(userId ? { userId } : {}),
      },
      orderBy: [{ workDate: "desc" }, { userId: "asc" }, { markedAt: "asc" }],
      include: {
        user: { select: { id: true, name: true } },
        correctedBy: { select: { name: true } },
      },
    });

    // Lo que vale son las marcas ya corregidas; las originales siguen en la
    // tabla y se listan aparte para que se vean las dos.
    const byPerson = new Map<string, typeof all>();
    for (const e of all) {
      const key = `${workDateKey(e.workDate)}|${e.userId}`;
      const bucket = byPerson.get(key);
      if (bucket) bucket.push(e);
      else byPerson.set(key, [e]);
    }

    const entries = [...byPerson.values()].flatMap((group) =>
      effectiveMarks(group).map((e) => ({
        ...e,
        user: group.find((g) => g.userId === e.userId)!.user,
      }))
    );

    const correctionLog = all
      .filter((e) => e.correctionKind !== null)
      .map((e) => ({
        key: `${workDateKey(e.workDate)}|${e.userId}`,
        kind: e.correctionKind,
        reason: e.correctionReason,
        by: e.correctedBy?.name ?? null,
      }));

    // Una fila por colaborador y jornada, con sus cuatro marcas.
    const rows = new Map<
      string,
      {
        workDate: string;
        userId: string;
        userName: string;
        marks: Record<
          string,
          {
            at: string;
            distanceM: number | null;
            geoStatus: string | null;
            outsideGeofence: boolean | null;
            foreignNetwork: boolean | null;
            sharedDevice: boolean | null;
            entryId: string;
          }
        >;
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
        outsideGeofence: e.outsideGeofence,
        foreignNetwork: e.foreignNetwork,
        sharedDevice: e.sharedDevice,
        entryId: e.id,
      };
      if (e.ipAddress && !row.ips.includes(e.ipAddress)) row.ips.push(e.ipAddress);
      if (e.deviceId && !row.devices.includes(e.deviceId)) row.devices.push(e.deviceId);
      if (e.reason) row.reasons.push(e.reason);
    }

    // Las anotaciones de esas jornadas, para que RH no tenga que deducirlas.
    const incidents = await prisma.timeClockIncident.findMany({
      where: {
        workDate: { gte: from, lte: to },
        ...(userId ? { userId } : {}),
      },
      select: { userId: true, workDate: true, kind: true, minutesLate: true },
    });

    const flagsByKey = new Map<string, { kind: string; minutesLate: number | null }[]>();
    for (const i of incidents) {
      const key = `${workDateKey(i.workDate)}|${i.userId}`;
      const bucket = flagsByKey.get(key);
      const flag = { kind: i.kind, minutesLate: i.minutesLate };
      if (bucket) bucket.push(flag);
      else flagsByKey.set(key, [flag]);
    }

    // Los festivos del rango, para que RH no confunda una jornada sin
    // anotaciones con un error: ese día no se juzgó.
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, name: true },
    });

    return Response.json({
      holidays: holidays.map((h) => ({ date: workDateKey(h.date), name: h.name })),
      rows: [...rows.entries()].map(([key, row]) => ({
        ...row,
        flags: flagsByKey.get(key) ?? [],
        corrections: correctionLog.filter((c) => c.key === key),
      })),
    });
  });
}
