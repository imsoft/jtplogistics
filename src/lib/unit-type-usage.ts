import { prisma } from "@/lib/db";

/**
 * Dónde se usa un tipo de unidad. Antes solo se revisaba el tipo principal de
 * la ruta: se podía borrar uno que estaba en los targets por tipo, en clientes,
 * en tarifas de transportistas o en embarques, y la ruta luego lo cambiaba sola
 * a "caja seca". Devuelve el motivo para no borrarlo, o null si está libre.
 */
export async function unitTypeInUse(value: string): Promise<string | null> {
  const [routes, targets, clients, carriers, shipments] = await Promise.all([
    prisma.route.count({ where: { unitType: value } }),
    prisma.routeUnitTarget.count({ where: { unitType: value } }),
    prisma.clientRoute.count({ where: { unitType: value } }),
    prisma.carrierRoute.count({ where: { unitType: value } }),
    prisma.shipment.count({ where: { unit: value } }),
  ]);
  if (routes + targets > 0) return "hay rutas que lo usan";
  if (clients > 0) return "hay clientes con rutas de este tipo";
  if (carriers > 0) return "hay transportistas con tarifas de este tipo";
  if (shipments > 0) return "hay embarques con este tipo de unidad";
  return null;
}
