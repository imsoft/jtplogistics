import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import type { EquipmentKind, MaintenanceKind, Prisma } from "@prisma/client";

const INCLUDE = {
  laptop: { select: { id: true, name: true, equipmentCode: true, assignedTo: { select: { name: true } } } },
  phone: { select: { id: true, name: true, equipmentCode: true, assignedTo: { select: { name: true } } } },
  technician: { select: { id: true, name: true } },
  ticket: { select: { id: true, title: true } },
};

/** GET: bitácora completa, de lo más próximo a lo más antiguo. */
export async function GET(request: NextRequest) {
  try {
    await requireDeveloper();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const maintenances = await prisma.maintenance.findMany({
      where: status === "scheduled" || status === "done" || status === "cancelled"
        ? { status }
        : undefined,
      orderBy: [{ scheduledFor: "desc" }],
      include: INCLUDE,
    });
    return Response.json(maintenances);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/maintenance] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST: programar un mantenimiento a futuro o anotar uno ya hecho.
 *
 * Anotar uno hecho manda `status: "done"` con su fecha real, lo que se hizo y
 * las fotos: así no hay que programarlo primero y luego cerrarlo, que era el
 * camino largo para el trabajo que ya se había realizado.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireDeveloper();
    const body = (await request.json()) as {
      kind?: string;
      equipmentKind?: string;
      equipmentId?: string;
      description?: string;
      scheduledFor?: string;
      ticketId?: string | null;
      /** "done" para anotar uno ya hecho; si no, queda programado. */
      status?: string;
      performedAt?: string;
      findings?: string | null;
      photos?: { url: string; publicId?: string }[];
    };

    if (body.kind !== "preventive" && body.kind !== "corrective") {
      return Response.json({ error: "Elige si es preventivo o correctivo." }, { status: 400 });
    }
    if (body.equipmentKind !== "laptop" && body.equipmentKind !== "phone") {
      return Response.json({ error: "Elige el tipo de equipo." }, { status: 400 });
    }
    if (!body.equipmentId) {
      return Response.json({ error: "Elige el equipo." }, { status: 400 });
    }
    const description = body.description?.trim() ?? "";
    if (!description) {
      return Response.json({ error: "Describe qué se va a hacer." }, { status: 400 });
    }
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      return Response.json({ error: "Elige la fecha del mantenimiento." }, { status: 400 });
    }

    const equipmentKind = body.equipmentKind as EquipmentKind;
    const yaHecho = body.status === "done";

    // Anotar uno ya hecho exige su fecha real: es el dato que revisa el auditor.
    let performedAt: Date | null = null;
    if (yaHecho) {
      performedAt = body.performedAt ? new Date(body.performedAt) : scheduledFor;
      if (Number.isNaN(performedAt.getTime())) {
        return Response.json({ error: "Elige la fecha en que se hizo." }, { status: 400 });
      }
    }

    // A quién se le hizo: se congela el responsable que tiene el equipo hoy,
    // porque mañana puede estar asignado a otra persona.
    const owner =
      equipmentKind === "laptop"
        ? await prisma.laptop.findUnique({
            where: { id: body.equipmentId },
            select: { assignedTo: { select: { name: true } } },
          })
        : await prisma.phone.findUnique({
            where: { id: body.equipmentId },
            select: { assignedTo: { select: { name: true } } },
          });

    const data: Prisma.MaintenanceUncheckedCreateInput = {
      kind: body.kind as MaintenanceKind,
      equipmentKind,
      laptopId: equipmentKind === "laptop" ? body.equipmentId : null,
      phoneId: equipmentKind === "phone" ? body.equipmentId : null,
      description,
      findings: body.findings?.trim() || null,
      scheduledFor,
      performedAt,
      status: yaHecho ? "done" : "scheduled",
      photos: (body.photos ?? []) as unknown as Prisma.InputJsonValue,
      recipientName: owner?.assignedTo?.name ?? null,
      technicianId: session.user.id,
      ticketId: body.ticketId || null,
    };

    const maintenance = await prisma.maintenance.create({ data, include: INCLUDE });

    void logAudit({
      resource: "maintenance", resourceId: maintenance.id,
      resourceLabel: `${maintenance.kind === "preventive" ? "Preventivo" : "Correctivo"} ${yaHecho ? "registrado" : "programado"} — ${maintenance.laptop?.name ?? maintenance.phone?.name ?? ""}`,
      action: "created", userId: session.user.id, userName: session.user.name,
    });

    return Response.json(maintenance, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/maintenance] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
