/**
 * Alerts carriers when a new route is published that matches their operational profile.
 * "Match" = new route shares origin, destination, or destination state with any of the
 * carrier's already-assigned routes.
 * Fire-and-forget: errors are logged but never thrown.
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";

interface NewRouteInfo {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
}

export async function alertMatchingCarriers(route: NewRouteInfo): Promise<void> {
  try {
    // Load all carriers who already have at least one route assigned
    const carriers = await prisma.user.findMany({
      where: { role: "carrier" },
      select: {
        id: true,
        name: true,
        email: true,
        carrierRoutes: {
          select: {
            route: {
              select: {
                origin: true,
                destination: true,
                destinationState: true,
              },
            },
          },
        },
      },
    });

    const newOrigin = route.origin.toLowerCase();
    const newDest = route.destination.toLowerCase();
    const newState = route.destinationState?.toLowerCase() ?? null;

    const matched = carriers.filter((carrier) => {
      if (carrier.carrierRoutes.length === 0) return false;
      return carrier.carrierRoutes.some(({ route: cr }) => {
        const crOrigin = cr.origin.toLowerCase();
        const crDest = cr.destination.toLowerCase();
        const crState = cr.destinationState?.toLowerCase() ?? null;
        return (
          crOrigin === newOrigin ||
          crDest === newDest ||
          crOrigin === newDest ||
          crDest === newOrigin ||
          (newState && crState && newState === crState)
        );
      });
    });

    if (matched.length === 0) return;

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const routeHref = `${APP_URL}/carrier/dashboard/routes`;
    const routeLabel = `${route.origin} → ${route.destination}`;
    const stateSuffix = route.destinationState ? ` (${route.destinationState})` : "";

    const notifyInputs = matched.map((c) => ({
      userId: c.id,
      type: "new_route",
      title: "Nueva ruta disponible",
      body: `${routeLabel}${stateSuffix} coincide con tu perfil operativo.`,
      href: routeHref,
    }));

    const emailPromises = matched.map((c) =>
      sendEmail({
        to: c.email,
        subject: `Nueva ruta disponible: ${routeLabel}`,
        html: `
<p>Hola <strong>${c.name}</strong>,</p>
<p>Se publicó una nueva ruta que coincide con tu perfil operativo:</p>
<p style="font-size:18px;font-weight:bold;">${routeLabel}${stateSuffix}</p>
<p>Ingresa a la plataforma para conocer todos los detalles y ponerte en contacto con el equipo de JTP.</p>
${routeHref ? `<p><a href="${routeHref}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Ver rutas disponibles</a></p>` : ""}
<p style="color:#6b7280;font-size:12px;margin-top:24px;">JTP Logistics — Este correo es automático, por favor no respondas directamente.</p>
        `.trim(),
        text: `Hola ${c.name},\n\nSe publicó una nueva ruta que coincide con tu perfil operativo:\n\n${routeLabel}${stateSuffix}\n\nIngresa a la plataforma para conocer más detalles.\n${routeHref}\n\nJTP Logistics`,
      }).catch((e) => {
        console.error(`[carrier-route-alert] Error sending email to ${c.email}:`, e);
      })
    );

    await Promise.all([notify(notifyInputs), ...emailPromises]);
  } catch (e) {
    console.error("[carrier-route-alert] Error:", e);
  }
}
