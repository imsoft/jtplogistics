import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { logAudit } from "@/lib/audit-log";
import { computeTargetStatus } from "@/lib/target-status";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/email-layout";
import { buildUnlockRequestEmail } from "@/lib/carrier-email";
import { UNLOCK_APPROVERS_WHERE, unlockRequestRecipients } from "@/lib/unlock-request-notify";

export async function POST(request: NextRequest) {
  try {
    const { carrierId, userId, session } = await requireCarrierAccount("editRates");
    const body = await request.json();
    const { routeId, unitType } = body as { routeId?: string; unitType?: string };

    if (!routeId || !unitType) {
      return Response.json({ error: "routeId y unitType son requeridos" }, { status: 400 });
    }

    // Find the carrier route record
    const carrierRoute = await prisma.carrierRoute.findUnique({
      where: { carrierId_routeId_unitType: { carrierId, routeId, unitType } },
      include: {
        route: {
          select: { origin: true, destination: true, unitType: true, target: true, unitTargets: true },
        },
      },
    });

    if (!carrierRoute) {
      return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    // Solo se puede solicitar desbloqueo de rutas cuyo target quedó en rojo.
    // El target de JTP solo se usa aquí para validar; nunca se expone.
    const jtpTarget =
      carrierRoute.route.unitTargets.length > 0
        ? carrierRoute.route.unitTargets.find((ut) => ut.unitType === unitType)?.target ?? null
        : carrierRoute.route.unitType === unitType
          ? carrierRoute.route.target
          : null;
    const status = computeTargetStatus(jtpTarget, carrierRoute.carrierTarget ?? null);
    if (status !== "rojo") {
      return Response.json(
        { error: "Solo puedes solicitar el desbloqueo de rutas cuyo target está en rojo." },
        { status: 403 }
      );
    }

    // Mark as requested
    await prisma.carrierRoute.update({
      where: { id: carrierRoute.id },
      data: { editUnlockRequested: true },
    });

    // Se avisa a todo el que puede autorizar: dirección y los colaboradores
    // con permiso de editar proveedores (pricing). Cada quien recibe el enlace
    // a la ficha de su propio panel.
    const [approvers, company, unitDef] = await Promise.all([
      prisma.user.findMany({
        where: UNLOCK_APPROVERS_WHERE,
        select: { id: true, name: true, email: true, role: true, canUpdateProviders: true },
      }),
      prisma.user.findUnique({ where: { id: carrierId }, select: { name: true } }),
      prisma.unitTypeDef.findUnique({ where: { value: unitType }, select: { name: true } }),
    ]);
    const recipients = unlockRequestRecipients(approvers, carrierId);
    const requesterName = (session.user as { name: string }).name;
    const carrierName = company?.name ?? requesterName;
    const routeLabel = `${carrierRoute.route.origin} → ${carrierRoute.route.destination}`;
    const unitLabel = unitDef?.name ?? unitType;

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          type: "carrier_unlock_request",
          title: "Solicitud de edición de ruta",
          body: `${carrierName} solicita editar: ${routeLabel} (${unitLabel}).`,
          href: r.href,
          read: false,
        })),
      });

      // El correo no debe tumbar la solicitud: ya quedó registrada y avisada.
      await Promise.all(
        recipients.map((r) => {
          const built = buildUnlockRequestEmail({
            name: r.name,
            carrierName,
            requesterName,
            routeLabel,
            unitLabel,
            href: `${appUrl()}${r.href}`,
          });
          return sendEmail({ to: r.email, subject: built.subject, html: built.html, text: built.text }).catch(
            (e) => console.error(`[unlock-request] No salió el correo a ${r.email}:`, e)
          );
        })
      );
    }

    void logAudit({
      resource: "carrier_route_unlock_request",
      resourceId: carrierRoute.id,
      resourceLabel: `${carrierRoute.route.origin} → ${carrierRoute.route.destination}`,
      action: "created",
      userId,
      userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
