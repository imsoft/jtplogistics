import { prisma } from "@/lib/db";

/**
 * Si la persona ya tiene historial en el checador. Borrarla se lo llevaría en
 * cascada (checadas, retardos, faltas, permisos): en ese caso se da de baja,
 * no se elimina. Responde 409 listo para regresar desde la API.
 */
export async function deleteBlockedByHistory(userId: string): Promise<Response | null> {
  const [entries, incidents] = await Promise.all([
    prisma.timeClockEntry.count({ where: { userId } }),
    prisma.timeClockIncident.count({ where: { userId } }),
  ]);
  if (entries + incidents === 0) return null;
  return Response.json(
    { error: "Tiene registros en el checador. Dalo de baja en lugar de eliminarlo: así se conserva su historial." },
    { status: 409 }
  );
}
