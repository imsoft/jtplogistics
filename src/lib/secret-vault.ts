/**
 * Cifrado de las credenciales de activos (laptops, celulares, cuentas de correo
 * y perfiles de colaborador).
 *
 * NO son contraseñas de inicio de sesión: esas las guarda Better Auth con hash
 * y no se pueden revertir. Estas hay que poder mostrarlas al administrador
 * cuando las necesita, así que se cifran de forma reversible con AES-256-GCM.
 *
 * La llave vive en CREDENTIALS_ENCRYPTION_KEY (fuera de la base de datos), de
 * modo que un volcado de la BD por sí solo no revela nada.
 *
 * ⚠️ Si se pierde la llave, los valores cifrados son irrecuperables.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Prefijo de versión: permite rotar el esquema más adelante sin ambigüedad. */
const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32; // AES-256

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super(
      "Falta CREDENTIALS_ENCRYPTION_KEY. Genera una con: openssl rand -base64 32"
    );
    this.name = "MissingEncryptionKeyError";
  }
}

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new MissingEncryptionKeyError();

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY debe ser de ${KEY_BYTES} bytes en base64 (recibidos ${key.length}).`
    );
  }
  return key;
}

/** ¿Hay llave configurada? Sirve para degradar sin reventar. */
export function hasEncryptionKey(): boolean {
  return Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY);
}

/** ¿El valor guardado ya está cifrado con este esquema? */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

/**
 * Cifra un secreto. Devuelve `v1:<iv>:<tag>:<datos>` en base64.
 * Los valores vacíos se guardan como null, no como cadena cifrada.
 */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  // Idempotente: si ya viene cifrado no se vuelve a cifrar.
  if (isEncrypted(plain)) return plain;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Descifra un valor guardado.
 *
 * Los valores que aún no están cifrados se devuelven tal cual: la migración de
 * los datos existentes corre por separado y la aplicación tiene que seguir
 * funcionando mientras tanto.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  if (!isEncrypted(stored)) return stored;

  const [, ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    console.error("[secret-vault] Valor cifrado con formato inválido.");
    return null;
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch (e) {
    // Llave equivocada o datos alterados: GCM lo detecta y falla la validación.
    console.error("[secret-vault] No se pudo descifrar:", (e as Error).message);
    return null;
  }
}

/** Para las respuestas de listado: indica si hay contraseña sin revelarla. */
export function hasSecret(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.trim() !== "";
}
