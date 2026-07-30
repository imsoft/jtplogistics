import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";
import { broadcastMural } from "@/lib/mural-notify";
import { logAudit } from "@/lib/audit-log";
import { isMuralEntryType } from "@/lib/constants/mural";
import { serializeEntry, parseMuralDate, formatDateRange, entryKindLabel } from "@/lib/mural";
import type { Prisma } from "@prisma/client";

const INCLUDE = {
  author: { select: { name: true } },
  subject: { select: { name: true } },
} satisfies Prisma.MuralEntryInclude;

export function GET(request: Request) {
  return muralHandler("canViewMural", async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const from = parseMuralDate(searchParams.get("from"));
    const to = parseMuralDate(searchParams.get("to"));

    const where: Prisma.MuralEntryWhereInput = {};
    if (isMuralEntryType(type)) where.type = type;
    if (from || to) {
      // Una entrada entra al rango si su periodo lo toca en cualquier punto.
      if (from) where.OR = [{ endDate: { gte: from } }, { endDate: null, startDate: { gte: from } }];
      if (to) where.startDate = { lte: to };
    }

    const entries = await prisma.muralEntry.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: INCLUDE,
    });

    return Response.json(entries.map(serializeEntry));
  });
}

export function POST(request: Request) {
  return muralHandler("canCreateMural", async (session) => {
    const body = (await request.json()) as Record<string, unknown>;
    const {
      type,
      title,
      description,
      location,
      startDate,
      endDate,
      imageUrl,
      imagePublicId,
      subjectUserId,
      notifyByEmail,
    } = body;

    if (!isMuralEntryType(type)) {
      return Response.json({ error: "Tipo de entrada inválido" }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return Response.json({ error: "El título es requerido" }, { status: 400 });
    }
    const start = parseMuralDate(startDate);
    if (!start) {
      return Response.json({ error: "La fecha de inicio es requerida" }, { status: 400 });
    }
    const end = parseMuralDate(endDate);
    if (end && end < start) {
      return Response.json(
        { error: "La fecha de fin no puede ser anterior a la de inicio" },
        { status: 400 }
      );
    }

    const entry = await prisma.muralEntry.create({
      data: {
        type,
        title: title.trim(),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        location: typeof location === "string" && location.trim() ? location.trim() : null,
        startDate: start,
        endDate: end,
        imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
        imagePublicId: typeof imagePublicId === "string" && imagePublicId ? imagePublicId : null,
        subjectUserId: typeof subjectUserId === "string" && subjectUserId ? subjectUserId : null,
        authorId: session.user.id,
      },
      include: INCLUDE,
    });

    const kind = entryKindLabel(entry.type);
    const range = formatDateRange(entry.startDate, entry.endDate);

    void broadcastMural({
      type: `mural_${entry.type}`,
      title: `${kind}: ${entry.title}`,
      body: range,
      path: "/dashboard/mural",
      sendEmail: notifyByEmail !== false,
      emailSubject: `Mural JTP · ${kind}: ${entry.title}`,
      emailHeading: entry.title,
      emailParagraphs: [
        `Se publicó <strong>${kind.toLowerCase()}</strong> en el mural de JTP Logistics.`,
        `<strong>Fecha:</strong> ${range}`,
        ...(entry.location ? [`<strong>Lugar:</strong> ${entry.location}`] : []),
        ...(entry.subject ? [`<strong>Colaborador:</strong> ${entry.subject.name}`] : []),
        ...(entry.description ? [entry.description] : []),
      ],
      excludeUserId: session.user.id,
    });

    void logAudit({
      resource: "mural_entry",
      resourceId: entry.id,
      resourceLabel: entry.title,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json(serializeEntry(entry), { status: 201 });
  });
}
