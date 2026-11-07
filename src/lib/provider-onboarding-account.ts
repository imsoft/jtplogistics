/**
 * Cuenta del proveedor que nace sola al completar su alta. Reglas puras (sin
 * base de datos) para poder probarlas; lo que toca la base vive en
 * `provider-onboarding-account-server.ts`.
 */

import { isDocsComplete, type DocRecord } from "@/lib/provider-onboardings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 12 (moral) o 13 (física) caracteres. Se admiten & y Ñ, que el SAT usa. */
const RFC_RE = /^[A-ZÑ&0-9]{12,13}$/;

/** Correo como se guarda: sin espacios y en minúsculas. Vacío = null. */
export function normalizeOnboardingEmail(value: string): string | null {
  const v = value.trim().toLocaleLowerCase("es-MX");
  return v || null;
}

/** RFC como se guarda: sin espacios ni guiones y en mayúsculas. Vacío = null. */
export function normalizeRfc(value: string): string | null {
  const v = value.replace(/[\s-]/g, "").toLocaleUpperCase("es-MX");
  return v || null;
}

export function isValidOnboardingEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function isValidRfc(rfc: string): boolean {
  return RFC_RE.test(rfc);
}

/** Mensaje de error del correo o RFC (ya normalizados), o null si están bien. */
export function validateOnboardingContact(input: { email: string | null; rfc: string | null }): string | null {
  if (input.email && !isValidOnboardingEmail(input.email)) return "Escribe un correo válido.";
  if (input.rfc && !isValidRfc(input.rfc)) return "El RFC debe tener 12 o 13 letras y números.";
  return null;
}

/**
 * Si al guardar el alta toca crear (o ligar) la cuenta del proveedor: el
 * expediente completo (la misma regla que pone la fecha de alta completa),
 * con correo y RFC, y sin cuenta ligada todavía.
 */
export function shouldCreateProviderAccount(row: {
  docs: DocRecord;
  email: string | null;
  rfc: string | null;
  userId: string | null;
}): boolean {
  if (row.userId) return false;
  if (!row.email || !isValidOnboardingEmail(row.email)) return false;
  if (!row.rfc || !isValidRfc(row.rfc)) return false;
  return isDocsComplete(row.docs);
}

/** A dónde lleva "Ver perfil del proveedor" según el panel. */
export function providerProfileHref(panel: "admin" | "collaborator", userId: string): string {
  return panel === "admin" ? `/admin/dashboard/users/${userId}` : `/collaborator/dashboard/providers/${userId}`;
}

/** Margen para dar por hecho el cambio de contraseña que se acaba de pedir. */
export const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Si la credencial se cambió hace poco (Better Auth renueva `updatedAt` al
 * cambiar la contraseña). Sin esto, bastaría con llamar a la API para quitarse
 * el cambio obligatorio sin cambiar nada.
 */
export function passwordRecentlyChanged(
  account: { createdAt: Date; updatedAt: Date },
  now: Date
): boolean {
  const changedAfterCreation = account.updatedAt.getTime() - account.createdAt.getTime() > 1000;
  const recent = now.getTime() - account.updatedAt.getTime() <= PASSWORD_CHANGE_WINDOW_MS;
  return changedAfterCreation && recent;
}
