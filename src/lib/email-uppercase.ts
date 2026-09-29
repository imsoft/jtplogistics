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

/**
 * Marcas invisibles (uso privado de Unicode) para lo que debe llegar tal cual:
 * las contraseñas. Una contraseña distingue mayúsculas, y subirla en el correo
 * hace que la que recibe la persona no le sirva. Las marcas se quitan al
 * procesar el correo, así que nunca llegan al destinatario.
 */
const KEEP_OPEN = "\uE000";
const KEEP_CLOSE = "\uE001";
/** Con grupo de captura: al partir, lo marcado queda en las posiciones impares. */
const KEEP_REGION = /\uE000([\s\S]*?)\uE001/;
const STRAY_MARKS = /[\uE000\uE001]/g;

/**
 * Marca un texto para que el correo lo conserve exactamente como está. Se
 * envuelve el valor ya escapado y nunca una etiqueta HTML.
 */
export function keepCase(value: string): string {
  return `${KEEP_OPEN}${value}${KEEP_CLOSE}`;
}

/** Aplica `transform` fuera de lo marcado; lo marcado sale intacto y sin marcas. */
function outsideKept(value: string, transform: (chunk: string) => string): string {
  return value
    .split(KEEP_REGION)
    .map((chunk, i) => (i % 2 === 0 ? transform(chunk) : chunk))
    .join("")
    .replace(STRAY_MARKS, "");
}

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
  return outsideKept(text, upperPlain);
}

function upperPlain(text: string): string {
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
  // Lo marcado se separa ANTES que las etiquetas y entidades: una contraseña con
  // "&" se escapa a "&amp;" y, partida por la entidad, perdería sus marcas.
  return outsideKept(html, (chunk) =>
    chunk
      .split(UNTOUCHED_IN_HTML)
      .map((part, i) => (i % 2 === 0 ? upperPlain(part) : part))
      .join("")
  );
}
