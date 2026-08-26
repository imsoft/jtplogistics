import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";
import { broadcastMural } from "@/lib/mural-notify";
import { logAudit, diffObjects } from "@/lib/audit-log";
import { isMuralEntryType } from "@/lib/constants/mural";
import {
  serializeEntry,
  parseMuralDate,
  formatDateRange,
  entryKindLabel,
  formatMuralDay,
} from "@/lib/mural";
import { escapeHtml } from "@/lib/email-layout";
import { startOfUtcDay } from "@/lib/mural-celebrations";
import type { Prisma } from "@prisma/client";

const INCLUDE = {
  author: { select: { name: true } },
  subject: { select: { name: true, image: true } },
} satisfies Prisma.MuralEntryInclude;

const FIELD_LABELS: Record<string, string> = {
  type: "Tipo",
  title: "Título",
  description: "Descripción",
  location: "Lugar",
  startDate: "Inicio",
  endDate: "Fin",
  subjectUserId: "Colaborador",
};

/**
 * Cambios que le importan a quien ya se agendó la entrada. Mover la fecha o el
 * lugar obliga a avisar; retocar la descripción o la foto, no.
 */
const NOTIFIABLE_FIELDS = ["type", "title", "location", "startDate", "endDate"] as const;

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canViewMural", async () => {
    const { id } = await params;
    const entry = await prisma.muralEntry.findUnique({ where: { id }, include: INCLUDE });
    if (!entry) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(serializeEntry(entry));
  });
}

export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canUpdateMural", async (session) => {
    const { id } = await params;
    const current = await prisma.muralEntry.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const data: Prisma.MuralEntryUpdateInput = {};

    if (body.type !== undefined) {
      if (!isMuralEntryType(body.type)) {
        return Response.json({ error: "Tipo de entrada inválido" }, { status: 400 });
      }
      data.type = body.type;
    }
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return Response.json({ error: "El título es requerido" }, { status: 400 });
      }
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (body.location !== undefined) {
      data.location =
        typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;
    }
    if (body.startDate !== undefined) {
      const start = parseMuralDate(body.startDate);
      if (!start) return Response.json({ error: "Fecha de inicio inválida" }, { status: 400 });
      data.startDate = start;
    }
    if (body.endDate !== undefined) {
      data.endDate = parseMuralDate(body.endDate);
    }
    if (body.imageUrl !== undefined) {
      data.imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
      data.imagePublicId =
        typeof body.imagePublicId === "string" && body.imagePublicId ? body.imagePublicId : null;
    }
    if (body.subjectUserId !== undefined) {
      const subjectId =
        typeof body.subjectUserId === "string" && body.subjectUserId ? body.subjectUserId : null;
      data.subject = subjectId ? { connect: { id: subjectId } } : { disconnect: true };
    }

    const start = (data.startDate as Date | undefined) ?? current.startDate;
    const end = body.endDate !== undefined ? (data.endDate as Date | null) : current.endDate;
    if (end && end < start) {
      return Response.json(
        { error: "La fecha de fin no puede ser anterior a la de inicio" },
        { status: 400 }
      );
    }

    const entry = await prisma.muralEntry.update({ where: { id }, data, include: INCLUDE });

    // Sin formateador, una fecha se imprimiría como "Mon Aug 18 2026 00:00:00
    // GMT+0000" tanto en la auditoría como en el correo.
    const changes = diffObjects(current, entry, FIELD_LABELS, {
      startDate: formatMuralDay,
      endDate: formatMuralDay,
    });

    // Solo se avisa si cambió algo que altera los planes de quien la tenía
    // agendada: la fecha, el lugar, el tipo o el título.
    const relevant = changes.filter((c) =>
      (NOTIFIABLE_FIELDS as readonly string[]).includes(c.field)
    );
    if (relevant.length > 0) {
      const kind = entryKindLabel(entry.type);
      const range = formatDateRange(entry.startDate, entry.endDate);
      const movedDate = relevant.some((c) => c.field === "startDate" || c.field === "endDate");

      void broadcastMural({
        type: `mural_${entry.type}_updated`,
        title: `Cambio en ${kind.toLowerCase()}: ${entry.title}`,
        body: movedDate ? `Nueva fecha: ${range}` : range,
        path: "/dashboard/mural",
        sendEmail: body.notifyByEmail !== false,
        emailSubject: `Mural JTP · Cambio en ${kind.toLowerCase()}: ${entry.title}`,
        emailHeading: entry.title,
        emailParagraphs: [
          `Se actualizó <strong>${kind.toLowerCase()}</strong> del mural de JTP Logistics.`,
          ...relevant.map(
            (c) =>
              `<strong>${escapeHtml(c.label)}:</strong> ${escapeHtml(c.from ?? "—")} → ${escapeHtml(c.to ?? "—")}`
          ),
          `<strong>Queda así:</strong> ${escapeHtml(range)}${
            entry.location ? ` · ${escapeHtml(entry.location)}` : ""
          }`,
        ],
        excludeUserId: session.user.id,
      });
    }

    void logAudit({
      resource: "mural_entry",
      resourceId: entry.id,
      resourceLabel: entry.title,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes,
    });

    return Response.json(serializeEntry(entry));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canDeleteMural", async (session) => {
    const { id } = await params;
    const entry = await prisma.muralEntry.findUnique({ where: { id } });
    if (!entry) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.muralEntry.delete({ where: { id } });

    // Cancelar algo que ya pasó no le sirve a nadie: el aviso sale solo si la
    // entrada estaba por venir.
    const lastDay = entry.endDate ?? entry.startDate;
    const stillUpcoming = lastDay >= startOfUtcDay(new Date());
    if (stillUpcoming) {
      const kind = entryKindLabel(entry.type);
      const range = formatDateRange(entry.startDate, entry.endDate);

      void broadcastMural({
        type: `mural_${entry.type}_cancelled`,
        title: `Se canceló ${kind.toLowerCase()}: ${entry.title}`,
        body: range,
        path: "/dashboard/mural",
        sendEmail: true,
        emailSubject: `Mural JTP · Se canceló ${kind.toLowerCase()}: ${entry.title}`,
        emailHeading: `Se canceló: ${entry.title}`,
        emailParagraphs: [
          `Se dio de baja <strong>${kind.toLowerCase()}</strong> del mural de JTP Logistics.`,
          `<strong>Estaba programado:</strong> ${escapeHtml(range)}`,
          ...(entry.location ? [`<strong>Lugar:</strong> ${escapeHtml(entry.location)}`] : []),
        ],
        excludeUserId: session.user.id,
      });
    }

    void logAudit({
      resource: "mural_entry",
      resourceId: entry.id,
      resourceLabel: entry.title,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
