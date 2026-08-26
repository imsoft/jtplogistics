/**
 * Pone en MAYÚSCULAS el texto de los correos, como el resto de la plataforma.
 *
 * No basta con `toUpperCase()` sobre el HTML: eso rompería los enlaces
 * (`HTTPS://...`), las entidades (`&AMP;`) y los atributos. Aquí se sube solo
 * el texto que la persona llega a leer y se deja intacto todo lo demás.
 *
 * Tampoco sirve `text-transform: uppercase` en el estilo: Outlook de Windows
 * usa el motor de Word y lo ignora.
 */

/** Lo que nunca se toca dentro de un texto plano: URLs y correos. */
const UNTOUCHED_IN_TEXT = /(https?:\/\/\S+|mailto:\S+|[^\s<>@]+@[^\s<>@]+\.[^\s<>@,;:]+)/gi;

/** Etiquetas HTML y entidades: `<a href="…">` y `&amp;`. */
const UNTOUCHED_IN_HTML = /(<[^>]*>|&[a-zA-Z]+;|&#\d+;)/g;

/** El acento de la ñ y las vocales se conserva: "Cañón" → "CAÑÓN". */
function upper(value: string): string {
  return value.toLocaleUpperCase("es-MX");
}

/**
 * Sube el texto plano, respetando URLs y direcciones de correo, que distinguen
 * mayúsculas en la parte del path.
 */
export function uppercaseEmailText(text: string): string {
  return text
    .split(UNTOUCHED_IN_TEXT)
    .map((chunk, i) => (i % 2 === 0 ? upper(chunk) : chunk))
    .join("");
}

/**
 * Sube el HTML dejando intactas las etiquetas (con sus atributos y URLs) y las
 * entidades; dentro del texto visible también se respetan las URLs escritas.
 */
export function uppercaseEmailHtml(html: string): string {
  return html
    .split(UNTOUCHED_IN_HTML)
    .map((chunk, i) => (i % 2 === 0 ? uppercaseEmailText(chunk) : chunk))
    .join("");
}
