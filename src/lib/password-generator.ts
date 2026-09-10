/**
 * Genera contraseñas temporales. Puro y sin base de datos, para poder probarlo.
 */

import { randomBytes } from "node:crypto";

/** Mínimo que pide Better Auth. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Contraseña temporal legible: se dicta por teléfono sin confundir mayúsculas
 * con minúsculas ni el 0 con la O. El alfabeto excluye O, 0, I, 1 y U a
 * propósito — la última porque suena igual que otras letras al deletrear.
 */
export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";
  const bytes = randomBytes(8);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `JTP-${body}`;
}
