import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";
import { logAudit, diffObjects } from "@/lib/audit-log";
import { isMuralEntryType } from "@/lib/constants/mural";
import { serializeEntry, parseMuralDate } from "@/lib/mural";
import type { Prisma } from "@prisma/client";

const INCLUDE = {
  author: { select: { name: true } },
  subject: { select: { name: true } },
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

    void logAudit({
      resource: "mural_entry",
      resourceId: entry.id,
      resourceLabel: entry.title,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: diffObjects(current, entry, FIELD_LABELS),
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
