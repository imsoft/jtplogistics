/**
 * Mayúsculas y minúsculas en los PDF de cotización.
 *
 * La plataforma enseña todo en mayúsculas mientras se escribe, así que nadie ve
 * cómo queda guardado el texto: hay capturas en MAYÚSCULAS, en minúsculas y
 * bien escritas, mezcladas. El PDF lo lee el cliente final, y ahí el cliente
 * pidió formato normal: con mayúscula lo que la lleva, lo demás en minúscula.
 *
 * Regla de oro: si un texto ya mezcla mayúsculas y minúsculas, alguien lo
 * escribió así a propósito y se respeta tal cual. Solo se toca lo que está
 * todo en mayúsculas o todo en minúsculas.
 *
 * Límite conocido: con solo el texto no hay forma de saber que "UPM" es una
 * sigla y "POLESA" no. Las siglas que sí se conocen están en ACRONYMS.
 */

const LOCALE = "es-MX";

/** Siglas que siempre van en mayúsculas. Se comparan sin puntos: "s.a." → "sa". */
const ACRONYMS = new Set([
  "iva", "rfc", "cfdi", "curp", "nss", "sat", "imss", "isr", "ieps",
  "dta", "igi", "eta", "clabe", "usd", "mxn", "eur",
  "jtp", "gps", "cdmx", "edomex", "ltl", "ftl",
  "fob", "cif", "exw", "ddp", "dap",
  "rrhh", "bbva", "hsbc",
  "sa", "cv", "rl", "sapi",
]);

/** Palabras que en un nombre van en minúscula, salvo al principio. */
const PARTICLES = new Set(["de", "del", "la", "las", "los", "el", "en", "y", "e", "van", "von", "da", "di"]);

/** Correos y direcciones web: nunca se tocan y no cuentan al decidir. */
const UNTOUCHED_RE = /(https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+\.[^\s@,;:]+)/gi;

const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

// Letra por letra y sin cambiar la longitud: el texto de los términos se
// vuelve a cortar en sus pedazos originales por posición.
function lower(ch: string): string {
  const l = ch.toLocaleLowerCase(LOCALE);
  return l.length === 1 ? l : ch;
}
function upper(ch: string): string {
  const u = ch.toLocaleUpperCase(LOCALE);
  return u.length === 1 ? u : ch;
}

function protectedMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false);
  for (const m of text.matchAll(UNTOUCHED_RE)) {
    const start = m.index ?? 0;
    for (let i = start; i < start + m[0].length; i++) mask[i] = true;
  }
  return mask;
}

/** Si el texto ya trae mayúsculas y minúsculas (sin contar correos ni URLs). */
export function isMixedCase(text: string): boolean {
  const mask = protectedMask(text);
  let hasUpper = false;
  let hasLower = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (mask[i] || !LETTER.test(ch)) continue;
    if (ch !== lower(ch)) hasUpper = true;
    else if (ch !== upper(ch)) hasLower = true;
    if (hasUpper && hasLower) return true;
  }
  return false;
}

function restoreAcronyms(text: string, mask: boolean[]): string {
  return text.replace(/[\p{L}.]+/gu, (token, offset: number) => {
    for (let i = offset; i < offset + token.length; i++) if (mask[i]) return token;
    const bare = token.replace(/\./g, "").toLocaleLowerCase(LOCALE);
    return ACRONYMS.has(bare) ? token.toLocaleUpperCase(LOCALE) : token;
  });
}

/** "s.a.", "c.v.", "no.": un punto que no cierra la frase. */
function isAbbreviation(word: string): boolean {
  const core = word.replace(/\.+$/, "");
  if (!core) return false;
  return core.includes(".") || core.length <= 2;
}

/**
 * Nombres de personas, empresas y lugares: mayúscula inicial en cada palabra.
 * "LAURA NUÑEZ" → "Laura Nuñez", "transportes del norte s.a. de c.v." →
 * "Transportes del Norte S.A. de C.V.".
 */
export function pdfTitle(value: string | null | undefined): string {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text || isMixedCase(text)) return text;
  return text
    .toLocaleLowerCase(LOCALE)
    .split(" ")
    .map((word, i) => {
      const bare = word.replace(/[^\p{L}]/gu, "");
      if (ACRONYMS.has(bare)) return word.toLocaleUpperCase(LOCALE);
      if (i > 0 && word === bare && PARTICLES.has(bare)) return word;
      // También tras guion o paréntesis: "Gómez-Palacio", "(Norte)".
      return word.replace(/(^|[-/(])(\p{L})/gu, (_, pre: string, ch: string) => pre + upper(ch));
    })
    .join(" ");
}

/**
 * Formato oración sobre un texto partido en pedazos.
 *
 * El editor de los términos parte una misma frase cada vez que cambia el
 * formato (negritas, cursivas). La mayúscula de inicio de frase se decide
 * sobre el texto corrido: pedazo por pedazo, una frase con una palabra en
 * negritas saldría "Tarifas No incluyen". Si el conjunto ya mezcla mayúsculas
 * y minúsculas, se devuelve intacto.
 */
export function sentenceCaseSegments(segments: string[]): string[] {
  const full = segments.join("");
  if (!full || isMixedCase(full)) return segments;
  const mask = protectedMask(full);

  let out = "";
  let capitalizeNext = true;
  let word = "";
  let prev = "";

  for (let i = 0; i < full.length; i++) {
    const ch = full[i];
    if (mask[i]) {
      out += ch;
      capitalizeNext = false;
      word = "";
    } else if (LETTER.test(ch)) {
      out += capitalizeNext ? upper(ch) : lower(ch);
      capitalizeNext = false;
      word += ch;
    } else if (DIGIT.test(ch)) {
      // "45 toneladas", no "45 Toneladas".
      out += ch;
      capitalizeNext = false;
      word = "";
    } else if (ch === ".") {
      out += ch;
      word += ch;
    } else {
      out += ch;
      if (/\s/.test(ch)) {
        const endsSentence =
          ch === "\n" || (/[.!?]/.test(prev) && !(prev === "." && isAbbreviation(word)));
        if (endsSentence) capitalizeNext = true;
      }
      word = "";
    }
    prev = ch;
  }

  const cased = restoreAcronyms(out, mask);
  const result: string[] = [];
  let cursor = 0;
  for (const seg of segments) {
    result.push(cased.slice(cursor, cursor + seg.length));
    cursor += seg.length;
  }
  return result;
}

/** Texto libre (unidades, puestos, restricciones): formato oración. */
export function pdfSentence(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return text;
  return sentenceCaseSegments([text])[0];
}
