/** Aviso de ruta nueva a un cliente: la parte sin base de datos. */

export interface NewClientRoute {
  origin: string;
  destination: string;
  unitLabel: string;
}

/** Texto del aviso: una ruta o varias de golpe. */
export function clientRouteAlertText(clientName: string, routes: NewClientRoute[], actorName: string) {
  const list = routes.map((r) => `${r.origin} → ${r.destination} (${r.unitLabel})`);
  const title =
    routes.length === 1 ? `Ruta nueva para ${clientName}` : `${routes.length} rutas nuevas para ${clientName}`;
  const body = `${actorName} le asignó a ${clientName}: ${list.join("; ")}.`;
  return { subject: title, title, body, list };
}
