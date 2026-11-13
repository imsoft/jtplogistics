/**
 * Teléfonos y placas con guiones, como los pidió el cliente:
 *  - teléfono de 10 dígitos → "33-3410-9866"; con lada de país → "+52-33-3410-9866";
 *  - placas en pares desde la izquierda; si sobra uno, se une al último par:
 *    "02AZ1A" → "02-AZ-1A", "JKL1234" → "JK-L1-234".
 *
 * Hay dos versiones de cada uno: la "live" se aplica mientras se escribe (no
 * reacomoda lo ya escrito) y la final se aplica al salir del campo y al
 * guardar en la base de datos.
 *
 * Puro, para poder probarlo (y usarlo en el cliente y en el servidor).
 */

/** Solo se formatea lo que parece un número: dígitos, espacios, guiones, puntos, paréntesis y "+". */
const PHONE_CHARS = /^[\d\s\-().+]*$/;

function groupPhone(d: string): string {
  return [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10)].filter(Boolean).join("-");
}

/** Separa la lada de país 52 (o 521, la antigua de celular) del número de 10 dígitos. */
function splitCountry(raw: string, d: string): { country: string; rest: string } {
  const plus = raw.trim().startsWith("+");
  if (d.length === 12 && d.startsWith("52")) return { country: "52", rest: d.slice(2) };
  if (d.length === 13 && d.startsWith("521")) return { country: "52", rest: d.slice(3) };
  if (plus && d.startsWith("52")) return { country: "52", rest: d.slice(2) };
  return { country: "", rest: d };
}

/** Mientras se escribe: va poniendo los guiones en 2-4-4. */
export function formatPhoneLive(value: string): string {
  if (!value || !PHONE_CHARS.test(value)) return value;
  const d = value.replace(/\D/g, "");
  if (!d) return value.trim().startsWith("+") ? "+" : "";
  const { country, rest } = splitCountry(value, d);
  if (country) return `+${country}${rest ? "-" + groupPhone(rest) : ""}`;
  // Más de 10 dígitos sin lada de México: se deja como se escribió.
  if (d.length > 10) return value;
  return groupPhone(d);
}

/**
 * Para guardar y mostrar: 10 dígitos → "33-3410-9866"; con lada de México →
 * "+52-33-3410-9866". Lo demás (extensiones, números extranjeros, texto) se
 * deja como está, solo sin espacios de sobra.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (!PHONE_CHARS.test(v)) return v;
  const d = v.replace(/\D/g, "");
  const { country, rest } = splitCountry(v, d);
  if (rest.length !== 10) return v;
  return country ? `+${country}-${groupPhone(rest)}` : groupPhone(rest);
}

const plateChars = (v: string) => v.toUpperCase().replace(/[^A-Z0-9Ñ]/g, "");

/** Mientras se escribe: pares de 2 ("02-AZ-1"). */
export function formatPlatesLive(value: string): string {
  if (!value) return "";
  const c = plateChars(value);
  return (c.match(/.{1,2}/g) ?? []).join("-");
}

/** Para guardar y mostrar: pares de 2; si sobra uno, se une al último par. */
export function formatPlates(value: string | null | undefined): string {
  if (!value) return "";
  const c = plateChars(value);
  if (c.length <= 3) return c;
  const pairs = c.match(/.{1,2}/g) ?? [];
  if (pairs.length > 1 && pairs[pairs.length - 1].length === 1) {
    const last = pairs.pop()!;
    pairs[pairs.length - 1] += last;
  }
  return pairs.join("-");
}

/** El SAT pide las placas sin guiones ni espacios (CFDI con Carta Porte). */
export function platesForSat(value: string | null | undefined): string {
  return plateChars(value ?? "");
}
