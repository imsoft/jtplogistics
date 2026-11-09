/**
 * Lo que comparten Prospección de clientes y Prospección de proveedores:
 * cómo va el próximo seguimiento. Puro, sin base de datos.
 */

export type FollowUpState = "vencido" | "hoy" | "proximo";

/**
 * Cómo va el próximo seguimiento respecto a hoy. Las dos fechas son
 * "YYYY-MM-DD" en la zona de la empresa; un prospecto cerrado no tiene
 * seguimiento pendiente aunque conserve la fecha.
 */
export function followUpStateFor(nextFollowUpOn: string | null, todayKey: string, open: boolean): FollowUpState | null {
  if (!nextFollowUpOn || !open) return null;
  if (nextFollowUpOn < todayKey) return "vencido";
  if (nextFollowUpOn === todayKey) return "hoy";
  return "proximo";
}

/** Vencido o para hoy: lo que hay que atender ya. */
export function isFollowUpDue(state: FollowUpState | null): boolean {
  return state === "vencido" || state === "hoy";
}
