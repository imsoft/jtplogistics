const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "refreshtoken",
  "accesstoken",
  "hash",
  "secret",
  "apikey",
]);

/** Campos cuyos strings no deben pasarse a minúsculas (p. ej. nombres propios de producto). */
const PRESERVE_CASE_KEYS = new Set(["producttypes", "title", "description", "department", "position", "name", "equipmenttype", "brand", "model", "accessories", "generalstate", "software",
  // Fecha y hora ("2026-11-18T04:04"): en minúsculas la "t" ya no se reconoce.
  "datetime",
  // Municipio y localidad salen de un catálogo: se guardan tal como vienen.
  "municipality", "locality",
  // La referencia del cliente se guarda tal como la escribe.
  "reference"]);

function shouldSkipLowercaseForKey(key?: string): boolean {
  if (!key) return false;
  // Los ids de usuario de Better Auth traen mayúsculas: en minúsculas ya no
  // existen. Aplica a `id` y a cualquier llave camelCase que termine en Id/Ids.
  if (/^id$|Ids?$/.test(key)) return true;
  const normalizedKey = key.replace(/[^a-z]/gi, "").toLowerCase();
  if (PRESERVE_CASE_KEYS.has(normalizedKey)) return true;
  return SENSITIVE_KEYS.has(normalizedKey);
}

/**
 * Convierte strings a minúsculas de forma recursiva para persistencia.
 * Excluye llaves sensibles (password/token/hash/etc.).
 */
export function normalizePayloadToLowercase<T>(value: T, parentKey?: string): T {
  if (typeof value === "string") {
    if (shouldSkipLowercaseForKey(parentKey)) {
      return value as T;
    }
    return value.toLowerCase() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizePayloadToLowercase(item, parentKey)) as T;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const normalizedEntries = Object.entries(objectValue).map(([key, itemValue]) => [
      key,
      normalizePayloadToLowercase(itemValue, key),
    ]);
    return Object.fromEntries(normalizedEntries) as T;
  }

  return value;
}
