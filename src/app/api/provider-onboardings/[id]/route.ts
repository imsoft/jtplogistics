import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireModuleAccess } from "@/lib/module-access";
import { companyDateKey } from "@/lib/time-clock";
import {
  CONTRACT_STATUS_LABELS,
  ONBOARDING_DOCS,
  completedOnAfterChange,
  validateHold,
  type DocRecord,
} from "@/lib/provider-onboardings";
import { MODULE, ONBOARDING_INCLUDE, onboardingToJson, readOnboardingBody } from "../route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess(MODULE, "view");
    const { id } = await params;
    const row = await prisma.providerOnboarding.findUnique({ where: { id }, include: ONBOARDING_INCLUDE });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(onboardingToJson(row));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings/:id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH /api/provider-onboardings/[id]
 * Sirve para la ficha completa y para cambios sueltos desde la tabla (un
 * documento, el estado del contrato, detener o reactivar).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(MODULE, "update");
    const { id } = await params;
    const current = await prisma.providerOnboarding.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { texts, dates, docs, contractStatus, prospectId } = readOnboardingBody(body);

    if (texts.legalName === null) return Response.json({ error: "La razón social no puede quedar vacía." }, { status: 400 });
    if (texts.commercialName === null) return Response.json({ error: "El nombre comercial no puede quedar vacío." }, { status: 400 });
    if (dates.startedOn === null) return Response.json({ error: "La fecha de inicio no puede quedar vacía." }, { status: 400 });

    // Detener/reactivar: `onHold` manda; el motivo viaja aparte.
    const onHold =
      typeof body.onHold === "boolean" ? body.onHold : dates.onHoldSince !== undefined ? dates.onHoldSince !== null : Boolean(current.onHoldSince);
    const holdReason = texts.holdReason !== undefined ? texts.holdReason ?? "" : current.holdReason ?? "";
    const holdError = validateHold({ onHold, holdReason });
    if (holdError) return Response.json({ error: holdError }, { status: 400 });

    const nextDocs = Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, docs[d.key] ?? current[d.key]])) as DocRecord;
    const currentCompleted = current.completedOn ? current.completedOn.toISOString().slice(0, 10) : null;
    const requestedCompleted = dates.completedOn === undefined ? currentCompleted : dates.completedOn ? dates.completedOn.toISOString().slice(0, 10) : null;
    const completedOn = completedOnAfterChange(nextDocs, requestedCompleted, companyDateKey(new Date()));

    const today = new Date(`${companyDateKey(new Date())}T00:00:00.000Z`);
    const onHoldSince = onHold ? (current.onHoldSince ?? dates.onHoldSince ?? today) : null;

    await prisma.providerOnboarding.update({
      where: { id },
      data: {
        ...(texts.legalName !== undefined && { legalName: texts.legalName! }),
        ...(texts.commercialName !== undefined && { commercialName: texts.commercialName! }),
        ...(prospectId !== undefined && { prospectId }),
        ...(dates.startedOn !== undefined && { startedOn: dates.startedOn! }),
        ...nextDocs,
        completedOn: completedOn ? new Date(`${completedOn}T00:00:00.000Z`) : null,
        ...(texts.altaAuthorizedBy !== undefined && { altaAuthorizedBy: texts.altaAuthorizedBy }),
        ...(contractStatus !== undefined && { contractStatus }),
        ...(dates.legalRequestedOn !== undefined && { legalRequestedOn: dates.legalRequestedOn }),
        ...(dates.legalReceivedOn !== undefined && { legalReceivedOn: dates.legalReceivedOn }),
        ...(dates.sentToProviderOn !== undefined && { sentToProviderOn: dates.sentToProviderOn }),
        ...(dates.signedReceivedOn !== undefined && { signedReceivedOn: dates.signedReceivedOn }),
        ...(texts.contractAuthorizedBy !== undefined && { contractAuthorizedBy: texts.contractAuthorizedBy }),
        ...(texts.notes !== undefined && { notes: texts.notes }),
        ...(texts.purchasingNotes !== undefined && { purchasingNotes: texts.purchasingNotes }),
        onHoldSince,
        holdReason: onHold ? holdReason.trim() : null,
      },
    });

    const changes: { field: string; label: string; from: string | null; to: string | null }[] = [];
    if (contractStatus && contractStatus !== current.contractStatus) {
      changes.push({ field: "contractStatus", label: "Contrato", from: CONTRACT_STATUS_LABELS[current.contractStatus], to: CONTRACT_STATUS_LABELS[contractStatus] });
    }
    if (onHold !== Boolean(current.onHoldSince)) {
      changes.push({ field: "onHold", label: "Detenido", from: current.onHoldSince ? "sí" : "no", to: onHold ? `sí: ${holdReason.trim()}` : "no" });
    }
    for (const d of ONBOARDING_DOCS) {
      if (nextDocs[d.key] !== current[d.key]) changes.push({ field: d.key, label: d.label, from: current[d.key], to: nextDocs[d.key] });
    }

    void logAudit({
      resource: "provider_onboarding",
      resourceId: id,
      resourceLabel: texts.legalName ?? current.legalName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes,
    });

    return Response.json({ ok: true, completedOn, onHoldSince: onHoldSince ? onHoldSince.toISOString().slice(0, 10) : null });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings/:id] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(MODULE, "delete");
    const { id } = await params;
    const current = await prisma.providerOnboarding.findUnique({ where: { id }, select: { legalName: true } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.providerOnboarding.delete({ where: { id } });

    void logAudit({
      resource: "provider_onboarding",
      resourceId: id,
      resourceLabel: current.legalName,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings/:id] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
