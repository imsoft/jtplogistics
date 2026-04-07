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
const PRESERVE_CASE_KEYS = new Set(["producttypes", "title", "description"]);

function shouldSkipLowercaseForKey(key?: string): boolean {
  if (!key) return false;
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
