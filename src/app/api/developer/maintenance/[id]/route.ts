import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import type { MaintenanceStatus, Prisma } from "@prisma/client";

const INCLUDE = {
  laptop: { select: { id: true, name: true, equipmentCode: true, serialNumber: true, assignedTo: { select: { name: true } } } },
  phone: { select: { id: true, name: true, equipmentCode: true, serialNumber: true, assignedTo: { select: { name: true } } } },
  technician: { select: { id: true, name: true } },
  ticket: { select: { id: true, title: true } },
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDeveloper();
    const { id } = await params;
    const maintenance = await prisma.maintenance.findUnique({ where: { id }, include: INCLUDE });
    if (!maintenance) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(maintenance);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/maintenance/id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH: cerrar el mantenimiento con su evidencia, o corregir lo capturado.
 * Al marcarlo como realizado se sella la fecha, que es lo que revisa el auditor.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireDeveloper();
    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      description?: string;
      findings?: string | null;
      scheduledFor?: string;
      performedAt?: string | null;
      photos?: { url: string; publicId?: string }[];
    };

    const current = await prisma.maintenance.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const data: Prisma.MaintenanceUncheckedUpdateInput = {};

    if (body.status) {
      if (!["scheduled", "done", "cancelled"].includes(body.status)) {
        return Response.json({ error: "Estado inválido" }, { status: 400 });
      }
      data.status = body.status as MaintenanceStatus;
      // Se sella la fecha real la primera vez que se marca como realizado.
      if (body.status === "done" && !current.performedAt) {
        data.performedAt = body.performedAt ? new Date(body.performedAt) : new Date();
      }
    }
    if (body.description !== undefined) {
      const d = body.description.trim();
      if (!d) return Response.json({ error: "La descripción no puede quedar vacía." }, { status: 400 });
      data.description = d;
    }
    if (body.findings !== undefined) data.findings = body.findings?.trim() || null;
    if (body.scheduledFor) {
      const f = new Date(body.scheduledFor);
      if (Number.isNaN(f.getTime())) return Response.json({ error: "Fecha inválida" }, { status: 400 });
      data.scheduledFor = f;
    }
    if (body.performedAt !== undefined && body.status !== "done") {
      data.performedAt = body.performedAt ? new Date(body.performedAt) : null;
    }
    if (body.photos !== undefined) data.photos = body.photos as unknown as Prisma.InputJsonValue;

    const maintenance = await prisma.maintenance.update({ where: { id }, data, include: INCLUDE });

    void logAudit({
      resource: "maintenance", resourceId: id,
      resourceLabel: `${maintenance.laptop?.name ?? maintenance.phone?.name ?? ""} — ${maintenance.status}`,
      action: "updated", userId: session.user.id, userName: session.user.name,
    });

    return Response.json(maintenance);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/maintenance/id] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireDeveloper();
    const { id } = await params;
    const m = await prisma.maintenance.findUnique({ where: { id }, select: { id: true, description: true } });
    if (!m) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.maintenance.delete({ where: { id } });
    void logAudit({
      resource: "maintenance", resourceId: id, resourceLabel: m.description.slice(0, 60),
      action: "deleted", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/maintenance/id] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
