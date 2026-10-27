import { prisma } from "@/lib/db";
import { requireModuleAccess } from "@/lib/module-access";

/**
 * Opciones del formulario de embarques para el colaborador: los pares
 * origen–destino de las rutas y los nombres de clientes. Solo lo necesario
 * para capturar el embarque (sin targets ni datos del cliente), así que basta
 * el permiso de Embarques y no hace falta tener el de Rutas o Clientes.
 */
export async function GET() {
  try {
    await requireModuleAccess("Shipments", "view");
    const [routes, clients] = await Promise.all([
      prisma.route.findMany({ select: { origin: true, destination: true }, distinct: ["origin", "destination"] }),
      prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return Response.json({ routes, clients });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[collaborator/shipment-options]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
