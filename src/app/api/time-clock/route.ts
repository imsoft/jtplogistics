import type { GeoStatus, TimeClockMark } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import {
  allowedMarksAfter,
  companyDateKey,
  distanceInMeters,
  isNetworkAllowed,
  workDateFromKey,
  workDateKey,
} from "@/lib/time-clock";
import { loadTimeClockConfig } from "@/lib/time-clock-config";
import { needsReason, standing } from "@/lib/time-clock-rules";
import { computeFlags } from "@/lib/time-clock-flags";
import {
  companyMinutes,
  judgeEntry,
  liveCounts,
  todayDateOnly,
  weekdayOf,
} from "@/lib/time-clock-judge";

const MARKS: TimeClockMark[] = ["clock_in", "lunch_start", "lunch_end", "clock_out"];
const GEO_STATUSES: GeoStatus[] = ["granted", "denied", "unavailable"];

/** La IP que ve Vercel; el primer salto del x-forwarded-for es el cliente. */
function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

/**
 * La jornada abierta del colaborador, si tiene una.
 *
 * Se busca por la última marca y no por la fecha de hoy: quien entró a las
 * 22:00 y sale a las 6:00 sigue dentro de la jornada de ayer, y sus cuatro
 * marcas tienen que caer en la misma fecha.
 */
async function openShift(userId: string) {
  const last = await prisma.timeClockEntry.findFirst({
    where: { userId },
    orderBy: { markedAt: "desc" },
    select: { mark: true, workDate: true },
  });
  if (!last || last.mark === "clock_out") return null;
  return last;
}

/**
 * GET /api/time-clock
 *
 * El estado del propio colaborador: qué puede marcar ahora y sus checadas de
 * la jornada en curso. Sin permisos: cualquiera consulta lo suyo.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const shift = await openShift(userId);
    const workDate = shift ? shift.workDate : workDateFromKey(companyDateKey());

    const [entries, schedule, counts] = await Promise.all([
      prisma.timeClockEntry.findMany({
        where: { userId, workDate },
        orderBy: { markedAt: "asc" },
        select: {
          id: true,
          mark: true,
          markedAt: true,
          distanceM: true,
          geoStatus: true,
          reason: true,
        },
      }),
      prisma.workSchedule.findUnique({
        where: { userId_weekday: { userId, weekday: weekdayOf(workDate) } },
        select: { startMinute: true, endMinute: true },
      }),
      liveCounts(prisma, userId),
    ]);

    // Cuándo caduca el retardo más viejo: sin esto el colaborador ve un número
    // sin saber cuándo baja.
    const nextExpiry = await prisma.timeClockIncident.findFirst({
      where: {
        userId,
        kind: "retardo",
        consumedById: null,
        expiresOn: { gte: todayDateOnly() },
      },
      orderBy: { expiresOn: "asc" },
      select: { expiresOn: true },
    });

    return Response.json({
      workDate: workDate.toISOString().slice(0, 10),
      lastMark: shift?.mark ?? null,
      allowed: allowedMarksAfter(shift?.mark ?? null),
      schedule: schedule
        ? { startMinute: schedule.startMinute, endMinute: schedule.endMinute }
        : null,
      standing: {
        ...standing({ retardosLibres: counts.retardosLibres, faltas: counts.faltas }),
        nextExpiry: nextExpiry ? workDateKey(nextExpiry.expiresOn) : null,
      },
      entries: entries.map((e) => ({
        id: e.id,
        mark: e.mark,
        markedAt: e.markedAt.toISOString(),
        distanceM: e.distanceM,
        geoStatus: e.geoStatus,
        reason: e.reason,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/time-clock
 * body: { mark, deviceId?, latitude?, longitude?, accuracy?, geoStatus? }
 *
 * Registra una checada. La hora la pone el servidor: el navegador dice QUÉ
 * marca, nunca cuándo. Marcar no se bloquea por ubicación — lo que salga se
 * guarda y la fase 2 decide si eso merece una bandera.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mark = body.mark as TimeClockMark;

    if (!MARKS.includes(mark)) {
      return Response.json({ error: "Marca desconocida." }, { status: 400 });
    }

    const shift = await openShift(userId);
    if (!allowedMarksAfter(shift?.mark ?? null).includes(mark)) {
      return Response.json(
        { error: "Esa marca no sigue en tu jornada. Vuelve a cargar la pantalla." },
        { status: 409 }
      );
    }

    // La entrada abre jornada nueva; las demás heredan la que ya está abierta.
    const workDate = shift ? shift.workDate : workDateFromKey(companyDateKey());

    const config = await loadTimeClockConfig();
    const ip = clientIp(request);

    // La red sí puede bloquear, a diferencia de la ubicación: estar conectado
    // al internet de la oficina es una condición que se controla, mientras que
    // el GPS falla solo. Con la lista vacía nunca bloquea (ver isNetworkAllowed).
    if (!isNetworkAllowed(config.network, ip)) {
      return Response.json(
        {
          error:
            "Esta conexión no es la de la oficina. El checador solo funciona desde la red de la empresa.",
        },
        { status: 403 }
      );
    }

    const lat = typeof body.latitude === "number" ? body.latitude : null;
    const lng = typeof body.longitude === "number" ? body.longitude : null;
    const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;

    let distanceM: number | null = null;
    if (lat !== null && lng !== null && config.geofence) {
      distanceM = distanceInMeters(
        { lat, lng },
        { lat: config.geofence.lat, lng: config.geofence.lng }
      );
    }

    const geoStatus =
      typeof body.geoStatus === "string" && GEO_STATUSES.includes(body.geoStatus as GeoStatus)
        ? (body.geoStatus as GeoStatus)
        : null;

    // El horario que RH le capturó para este día. Sin él no hay contra qué
    // comparar y no se le exige nada: el checador registra, no inventa reglas.
    const schedule = await prisma.workSchedule.findUnique({
      where: { userId_weekday: { userId, weekday: weekdayOf(workDate) } },
      select: { startMinute: true },
    });

    const lunchStart =
      mark === "lunch_end"
        ? await prisma.timeClockEntry.findFirst({
            where: { userId, workDate, mark: "lunch_start" },
            orderBy: { markedAt: "desc" },
            select: { markedAt: true },
          })
        : null;

    const markedAt = new Date();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 64) : null;

    // Llegar tarde obliga a explicarlo en el momento. Es lo que cierra el hueco
    // del aviso: nadie acumula retardos sin enterarse, porque no puede
    // registrar uno sin reconocerlo ahí mismo.
    const mustExplain = needsReason({
      mark,
      scheduledStart: schedule?.startMinute ?? null,
      markedMinute: companyMinutes(markedAt),
      lunchStartedAt: lunchStart?.markedAt ?? null,
      markedAt,
    });

    if (mustExplain && !reason) {
      return Response.json(
        {
          error:
            mark === "clock_in"
              ? "Llegaste pasada la tolerancia. Escribe por qué para poder registrar tu entrada."
              : "Te pasaste de la hora de comida. Escribe por qué para poder registrar tu regreso.",
          reasonRequired: true,
        },
        { status: 422 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const flags = await computeFlags(tx, {
        userId,
        workDate,
        ip,
        deviceId,
        distanceM,
        radiusM: config.geofence?.radiusM ?? null,
        network: config.network,
      });

      const entry = await tx.timeClockEntry.create({
        data: {
          userId,
          mark,
          workDate,
          markedAt,
          ...flags,
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
          deviceId,
          latitude: lat,
          longitude: lng,
          accuracyM: accuracy,
          distanceM,
          geoStatus,
          reason: reason || null,
        },
        select: { id: true, mark: true, markedAt: true },
      });

      const judged = await judgeEntry(tx, {
        userId,
        entryId: entry.id,
        mark,
        markedAt,
        workDate,
        scheduledStart: schedule?.startMinute ?? null,
        lunchStartedAt: lunchStart?.markedAt ?? null,
      });

      return { entry, judged, counts: await liveCounts(tx, userId) };
    });

    return Response.json({
      id: result.entry.id,
      mark: result.entry.mark,
      markedAt: result.entry.markedAt.toISOString(),
      allowed: allowedMarksAfter(result.entry.mark),
      retardo: result.judged.retardo,
      comidaLarga: result.judged.comidaLarga,
      faltaGenerada: result.judged.faltaGenerada,
      retardos: result.counts.retardosLibres,
      faltas: result.counts.faltas,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[time-clock] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
