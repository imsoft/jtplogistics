import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireProspectAccess } from "@/lib/prospect-auth";
import { PROSPECT_STATUS_LABELS, requiresDiscardReason } from "@/lib/provider-prospects";
import { prospectToJson, readProspectBody } from "../route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireProspectAccess("view");
    const { id } = await params;
    const p = await prisma.providerProspect.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    });
    if (!p) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(prospectToJson(p));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/:id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH /api/provider-prospects/[id]
 *
 * Sirve tanto para editar la ficha como para mover la etapa desde la tabla.
 * Descartar exige motivo: sin él, meses después nadie se acuerda de por qué.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireProspectAccess("update");
    const { id } = await params;
    const current = await prisma.providerProspect.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = readProspectBody(body);

    if (data.commercialName === null) {
      return Response.json({ error: "El nombre comercial no puede quedar vacío." }, { status: 400 });
    }

    const nextStatus = (data.status ?? current.status) as keyof typeof PROSPECT_STATUS_LABELS;
    const nextReason = data.discardReason !== undefined ? data.discardReason : current.discardReason;
    if (requiresDiscardReason(nextStatus) && !nextReason) {
      return Response.json({ error: "Escribe por qué se descarta." }, { status: 400 });
    }

    await prisma.providerProspect.update({
      where: { id },
      data: {
        ...(data.commercialName !== undefined && { commercialName: data.commercialName }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.legalName !== undefined && { legalName: data.legalName }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.discardReason !== undefined && { discardReason: data.discardReason }),
        ...(data.contactedOn !== undefined && { contactedOn: data.contactedOn }),
        ...(data.source !== undefined && { source: data.source as never }),
        ...(data.coverage !== undefined && { coverage: data.coverage as never }),
        ...(data.status !== undefined && { status: data.status as never }),
      },
    });

    const changes =
      data.status && data.status !== current.status
        ? [
            {
              field: "status",
              label: "Etapa",
              from: PROSPECT_STATUS_LABELS[current.status as keyof typeof PROSPECT_STATUS_LABELS],
              to: PROSPECT_STATUS_LABELS[nextStatus],
            },
          ]
        : [];

    void logAudit({
      resource: "provider_prospect",
      resourceId: id,
      resourceLabel: data.commercialName ?? current.commercialName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/:id] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireProspectAccess("delete");
    const { id } = await params;
    const current = await prisma.providerProspect.findUnique({
      where: { id },
      select: { commercialName: true },
    });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.providerProspect.delete({ where: { id } });

    void logAudit({
      resource: "provider_prospect",
      resourceId: id,
      resourceLabel: current.commercialName,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/:id] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
