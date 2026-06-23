import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

/** Guarda (crea o actualiza) la calificación manual de un transportista. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const legalName = String(body.legalName ?? "").trim();
    const stars = Number(body.stars);
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!legalName) {
      return Response.json({ error: "Falta la razón social del transportista." }, { status: 400 });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return Response.json({ error: "La calificación debe ser un número del 1 al 5." }, { status: 400 });
    }

    const existing = await prisma.carrierManualRating.findUnique({ where: { legalName } });

    const saved = await prisma.carrierManualRating.upsert({
      where: { legalName },
      create: { legalName, stars, notes: notes || null, ratedById: session.user.id },
      update: { stars, notes: notes || null, ratedById: session.user.id },
    });

    void logAudit({
      resource: "carrier_manual_rating",
      resourceId: saved.id,
      resourceLabel: legalName,
      action: existing ? "updated" : "created",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        { field: "stars", label: "Estrellas", from: existing ? String(existing.stars) : null, to: String(stars) },
        {
          field: "notes",
          label: "Notas",
          from: existing?.notes || null,
          to: notes || null,
        },
      ],
    });

    return Response.json({
      legalName: saved.legalName,
      stars: saved.stars,
      notes: saved.notes,
      ratedByName: session.user.name,
      ratedAt: saved.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** Elimina la calificación manual de un transportista. */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const legalName = String(body.legalName ?? "").trim();

    if (!legalName) {
      return Response.json({ error: "Falta la razón social del transportista." }, { status: 400 });
    }

    const existing = await prisma.carrierManualRating.findUnique({ where: { legalName } });
    if (!existing) {
      return Response.json({ ok: true });
    }

    await prisma.carrierManualRating.delete({ where: { legalName } });

    void logAudit({
      resource: "carrier_manual_rating",
      resourceId: existing.id,
      resourceLabel: legalName,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
