/**
 * Alerts carriers when a new route is published that matches their operational profile.
 * "Match" = new route shares origin, destination, or destination state with any of the
 * carrier's already-assigned routes.
 * Fire-and-forget: errors are logged but never thrown.
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildNewRouteEmail } from "@/lib/carrier-email";
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
    // Llevamos al transportista a la pantalla correcta de tipos de unidad
    // para que vea rutas ya seleccionadas (targets/volúmenes) y la nueva oferta.
    const routeHref = `${APP_URL}/carrier/dashboard/unit-types/${route.unitType}`;
    const routeLabel = `${route.origin} → ${route.destination}`;
    const stateSuffix = route.destinationState ? ` (${route.destinationState})` : "";

    const notifyInputs = matched.map((c) => ({
      userId: c.id,
      type: "new_route",
      title: "Nueva ruta disponible",
      body: `${routeLabel}${stateSuffix} coincide con tu perfil operativo.`,
      href: routeHref,
    }));

    const emailPromises = matched.map((c) => {
      const { subject, html, text } = buildNewRouteEmail({
        name: c.name,
        routeLabel,
        state: route.destinationState,
        href: routeHref,
      });
      return sendEmail({ to: c.email, subject, html, text }).catch((e) => {
        console.error(`[carrier-route-alert] Error sending email to ${c.email}:`, e);
      });
    });

    await Promise.all([notify(notifyInputs), ...emailPromises]);
  } catch (e) {
    console.error("[carrier-route-alert] Error:", e);
  }
}
