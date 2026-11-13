import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { isHalfStar, isMonthKey, monthLabel } from "@/lib/carrier-evaluation";
import { evaluationsFor } from "@/lib/carrier-evaluation-server";

/** GET /api/admin/carriers/evaluations?legalName= — evaluación general y por mes. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const legalName = (new URL(request.url).searchParams.get("legalName") ?? "").trim();
    if (!legalName) return Response.json({ error: "Falta la razón social." }, { status: 400 });
    return Response.json(await evaluationsFor(legalName));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[admin/carriers/evaluations] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/carriers/evaluations { legalName, month, stars | null, comment | null }
 * Ajusta la evaluación de un mes. Sin estrellas ni comentario, se borra el ajuste
 * y queda la automática.
 */
export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const legalName = typeof body.legalName === "string" ? body.legalName.trim() : "";
    if (!legalName) return Response.json({ error: "Falta la razón social." }, { status: 400 });
    if (!isMonthKey(body.month)) return Response.json({ error: "El mes no es válido." }, { status: 400 });
    const month = body.month;
    const stars = body.stars === null || body.stars === undefined || body.stars === "" ? null : Number(body.stars);
    if (stars !== null && !isHalfStar(stars)) {
      return Response.json({ error: "La calificación va de 1 a 5 estrellas, en medias (por ejemplo 4.5)." }, { status: 400 });
    }
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) || null : null;

    const existing = await prisma.carrierMonthlyEvaluation.findUnique({ where: { legalName_month: { legalName, month } } });
    if (stars === null && !comment) {
      if (existing) await prisma.carrierMonthlyEvaluation.delete({ where: { id: existing.id } });
    } else {
      await prisma.carrierMonthlyEvaluation.upsert({
        where: { legalName_month: { legalName, month } },
        create: { legalName, month, stars, comment, ratedById: session.user.id },
        update: { stars, comment, ratedById: session.user.id },
      });
    }

    void logAudit({
      resource: "carrier_monthly_evaluation",
      resourceId: `${legalName}:${month}`,
      resourceLabel: `${legalName} · ${monthLabel(month)}`,
      action: existing ? "updated" : "created",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        { field: "stars", label: "Estrellas", from: existing?.stars != null ? String(existing.stars) : null, to: stars !== null ? String(stars) : null },
        { field: "comment", label: "Comentario", from: existing?.comment ?? null, to: comment },
      ],
    });

    return Response.json(await evaluationsFor(legalName));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[admin/carriers/evaluations] PUT", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
