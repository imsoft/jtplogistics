/**
 * Las banderas que se le calculan a una checada en el momento de hacerla.
 *
 * Ninguna prueba nada por sí sola: el valor está en el cruce. Una ubicación de
 * la oficina junto a una conexión desde otra casa es una contradicción que
 * salta sola, y ahí es donde se caen las ubicaciones falsas.
 *
 * Se guardan y no se recalculan después a propósito: la configuración de la
 * oficina cambia con el tiempo y el registro tiene que decir qué se sabía
 * aquel día, no qué sabemos hoy.
 */

import type { Prisma } from "@prisma/client";
import { isNetworkForeign, type NetworkPolicy } from "@/lib/time-clock";

/**
 * Cuántas checadas de otras personas hacen falta ese día antes de fiarse de
 * "la conexión de la mayoría". Con dos o tres no hay mayoría que valga.
 */
const MIN_PEERS_FOR_CONSENSUS = 4;

type Tx = Prisma.TransactionClient;

export interface EntryFlags {
  outsideGeofence: boolean | null;
  foreignNetwork: boolean | null;
  sharedDevice: boolean | null;
}

/**
 * La conexión desde la que marcó la mayoría del equipo hoy.
 *
 * Existe porque el edificio no tiene internet fijo propio: en vez de preguntar
 * "¿es la conexión de la oficina?", que exigiría una IP que nadie garantiza,
 * se pregunta "¿es la misma desde la que marcó todo el mundo hoy?". El sistema
 * lo aprende solo cada día, sin configurar nada.
 */
export async function consensusIp(
  tx: Tx,
  workDate: Date,
  exceptUserId: string
): Promise<{ ip: string | null; peers: number }> {
  const rows = await tx.timeClockEntry.groupBy({
    by: ["ipAddress"],
    where: {
      workDate,
      userId: { not: exceptUserId },
      ipAddress: { not: null },
      correctionKind: null,
    },
    _count: { ipAddress: true },
  });

  const peers = rows.reduce((sum, r) => sum + r._count.ipAddress, 0);
  if (peers < MIN_PEERS_FOR_CONSENSUS) return { ip: null, peers };

  const top = rows.reduce((best, r) =>
    r._count.ipAddress > best._count.ipAddress ? r : best
  );
  return { ip: top.ipAddress, peers };
}

export async function computeFlags(
  tx: Tx,
  input: {
    userId: string;
    workDate: Date;
    ip: string | null;
    deviceId: string | null;
    distanceM: number | null;
    radiusM: number | null;
    network: NetworkPolicy;
  }
): Promise<EntryFlags> {
  const outsideGeofence =
    input.distanceM !== null && input.radiusM !== null
      ? input.distanceM > input.radiusM
      : null;

  // Primero la lista capturada; si no hay, la mayoría del día.
  let foreignNetwork: boolean | null = null;
  if (input.network.allowedIps.length > 0) {
    foreignNetwork = isNetworkForeign(input.network, input.ip);
  } else {
    const { ip: consensus } = await consensusIp(tx, input.workDate, input.userId);
    if (consensus) foreignNetwork = input.ip !== consensus;
  }

  // Dos personas marcando desde el mismo navegador en la misma jornada es la
  // huella que deja el favor entre compañeros.
  let sharedDevice: boolean | null = null;
  if (input.deviceId) {
    const others = await tx.timeClockEntry.count({
      where: {
        workDate: input.workDate,
        deviceId: input.deviceId,
        userId: { not: input.userId },
      },
    });
    sharedDevice = others > 0;
  }

  return { outsideGeofence, foreignNetwork, sharedDevice };
}
