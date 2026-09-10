import type { CorrectionKind, TimeClockMark } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { MARK_LABELS, companyTime, workDateFromKey } from "@/lib/time-clock";
import { reconcileFaltas } from "@/lib/time-clock-corrections";

const KINDS: CorrectionKind[] = ["adjust", "void", "add"];
const MARKS: TimeClockMark[] = ["clock_in", "lunch_start", "lunch_end", "clock_out"];

/**
 * POST /api/time-clock/corrections
 * body: { kind, reason, entryId?, userId?, workDate?, mark?, markedAt? }
 *
 * Corregir es facultad EXCLUSIVA de dirección: ni RH corrige lo ajeno ni lo
 * propio. Un control que se puede autoaplicar deja de ser un control para
 * quien tiene más facilidad de usarlo.
 *
 * La corrección no toca la checada original. Escribe un renglón nuevo que
 * apunta a ella y vuelve a cuadrar las faltas que hayan quedado incompletas.
 */
export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const kind = body.kind as CorrectionKind;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!KINDS.includes(kind)) {
      return Response.json({ error: "Tipo de corrección desconocido." }, { status: 400 });
    }
    // El motivo es obligatorio: una corrección sin explicación no vale como
    // evidencia, que es justo para lo que existe el registro.
    if (!reason) {
      return Response.json(
        { error: "Escribe por qué se corrige. Queda en el registro." },
        { status: 400 }
      );
    }

    let userId: string;
    let workDate: Date;
    let mark: TimeClockMark;
    let markedAt: Date;
    let originalLabel = "";

    if (kind === "add") {
      userId = String(body.userId ?? "");
      const workDateKeyIn = String(body.workDate ?? "");
      mark = body.mark as TimeClockMark;
      markedAt = new Date(String(body.markedAt ?? ""));

      if (!userId || !workDateKeyIn || !MARKS.includes(mark) || Number.isNaN(markedAt.getTime())) {
        return Response.json(
          { error: "Faltan datos para agregar la marca." },
          { status: 400 }
        );
      }
      workDate = workDateFromKey(workDateKeyIn);
    } else {
      const entryId = String(body.entryId ?? "");
      const original = await prisma.timeClockEntry.findUnique({
        where: { id: entryId },
        select: { id: true, userId: true, workDate: true, mark: true, markedAt: true },
      });
      if (!original) {
        return Response.json({ error: "No encontrado" }, { status: 404 });
      }

      userId = original.userId;
      workDate = original.workDate;
      originalLabel = `${MARK_LABELS[original.mark]} ${companyTime(original.markedAt)}`;

      if (kind === "void") {
        mark = original.mark;
        markedAt = original.markedAt;
      } else {
        mark = MARKS.includes(body.mark as TimeClockMark)
          ? (body.mark as TimeClockMark)
          : original.mark;
        markedAt = new Date(String(body.markedAt ?? ""));
        if (Number.isNaN(markedAt.getTime())) {
          return Response.json({ error: "La hora nueva no es válida." }, { status: 400 });
        }
      }
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const correction = await prisma.$transaction(async (tx) => {
      const created = await tx.timeClockEntry.create({
        data: {
          userId,
          mark,
          markedAt,
          workDate,
          correctionKind: kind,
          correctionOfId: kind === "add" ? null : String(body.entryId),
          correctedById: session.user.id,
          correctionReason: reason,
        },
        select: { id: true },
      });

      // Anular o mover una marca puede dejar sin sustento a un retardo, y con
      // él a la falta que se lo comió.
      if (kind !== "add") {
        await tx.timeClockIncident.deleteMany({
          where: { entryId: String(body.entryId), kind: { in: ["retardo", "comida_larga", "sin_comida"] } },
        });
        await reconcileFaltas(tx, userId);
      }

      return created;
    });

    const kindLabel =
      kind === "add" ? "Marca agregada" : kind === "void" ? "Marca anulada" : "Hora corregida";

    void logAudit({
      resource: "time_clock",
      resourceId: correction.id,
      resourceLabel: target?.name ?? "",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "correction",
          label: kindLabel,
          from: originalLabel || null,
          to: `${MARK_LABELS[mark]} ${companyTime(markedAt)} — ${reason}`,
        },
      ],
    });

    return Response.json({ ok: true, id: correction.id });
  });
}
