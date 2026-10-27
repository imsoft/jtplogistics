/**
 * Enlace de "Volver" que llega por ?from=: solo rutas internas. Una dirección
 * externa (https://…, //…) se cambia por la de respaldo.
 */
export function safeBackHref(from: string | null | undefined, fallback: string): string {
  if (!from) return fallback;
  let path: string;
  try {
    path = decodeURIComponent(from);
  } catch {
    return fallback;
  }
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}
