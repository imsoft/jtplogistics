/**
 * Identificador del navegador desde el que se marca.
 *
 * No identifica a la persona ni sirve para rastrearla: es un número al azar
 * que vive en este navegador. Sirve para una sola cosa — notar cuando dos
 * colaboradores distintos marcan desde el mismo equipo, que es la huella que
 * deja el favor entre compañeros.
 */

const KEY = "jtp.time-clock.device";

export function getDeviceId(): string | null {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Navegador con el almacenamiento bloqueado: se marca igual, sin la señal.
    return null;
  }
}
