/**
 * Plantilla base de los correos de JTP Logistics.
 *
 * Se arma con tablas y estilos en línea porque Gmail y Outlook ignoran las
 * hojas de estilo y buena parte de flexbox. Los colores, el radio y las
 * mayúsculas de los títulos son los mismos de la aplicación.
 */

/**
 * Los mismos colores que la interfaz, convertidos de los tokens `oklch` de
 * globals.css a hexadecimal: ningún cliente de correo entiende oklch.
 *
 *   --primary            → blue
 *   --foreground         → text
 *   --muted-foreground   → muted
 *   --border             → border
 *   --muted              → background
 *   --accent             → surface
 */
export const BRAND = {
  blue: "#1447E6",
  blueDark: "#193CB8",
  text: "#09090B",
  muted: "#57637D",
  border: "#D7DFEE",
  background: "#EAF1FF",
  surface: "#E3EEFF",
  onBlue: "#EFF6FF",
} as const;

/** El radio de la app (--radius: 0.625rem). */
const RADIUS = "10px";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** URL pública de la app, sin diagonal final. Vacía si no está configurada. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(
    /\/$/,
    ""
  );
}

export interface BrandedEmailOptions {
  /** Línea de vista previa que muestran Gmail y Apple Mail junto al asunto. */
  preheader?: string;
  /** Etiqueta pequeña sobre el título (p. ej. "Mural JTP Logistics"). */
  eyebrow?: string;
  heading: string;
  /** Cada elemento es un párrafo; admite HTML simple (<strong>, <em>). */
  paragraphs: string[];
  /** Bloque destacado opcional, debajo de los párrafos. */
  highlight?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Emoji grande sobre el título, para los correos de celebración. */
  emoji?: string;
  base?: string;
}

/**
 * Devuelve el HTML completo del correo. Si no hay URL pública configurada se
 * omiten el logo y el botón, porque en un correo los enlaces relativos no sirven.
 */
export function brandedEmail(options: BrandedEmailOptions): string {
  const {
    preheader,
    eyebrow,
    heading,
    paragraphs,
    highlight,
    ctaLabel,
    ctaHref,
    emoji,
    base = appUrl(),
  } = options;

  const logo = base
    ? `<img src="${base}/images/logo/jtp-logistics.png" width="130" height="130" alt="JTP Logistics" style="display:block;margin:0 auto;width:130px;height:130px;" />`
    : `<p style="margin:0;text-align:center;font-size:20px;font-weight:700;color:${BRAND.blue};letter-spacing:.02em;">JTP LOGISTICS</p>`;

  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:${BRAND.text};font-size:15px;line-height:1.65;">${p}</p>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:${BRAND.background};">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:${RADIUS};overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="height:5px;background:${BRAND.blue};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">${logo}</td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;text-align:center;">
              ${
                emoji
                  ? `<p style="margin:0 0 8px;font-size:44px;line-height:1;">${emoji}</p>`
                  : ""
              }
              ${
                eyebrow
                  ? `<p style="margin:0 0 8px;color:${BRAND.muted};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>`
                  : ""
              }
              <h1 style="margin:0 0 16px;color:${BRAND.blue};font-size:22px;line-height:1.3;font-weight:700;text-transform:uppercase;letter-spacing:.03em;">${escapeHtml(heading)}</h1>
              <div style="text-align:left;">${body}</div>
              ${
                highlight
                  ? `<div style="margin:18px 0 0;padding:14px 16px;background:${BRAND.surface};border-left:3px solid ${BRAND.blue};border-radius:${RADIUS};text-align:left;color:${BRAND.text};font-size:14px;line-height:1.6;">${highlight}</div>`
                  : ""
              }
              ${
                ctaLabel && ctaHref
                  ? `<p style="margin:26px 0 0;"><a href="${ctaHref}" style="background:${BRAND.blue};color:${BRAND.onBlue};padding:12px 26px;border-radius:${RADIUS};text-decoration:none;display:inline-block;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(ctaLabel)}</a></p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid ${BRAND.border};text-align:center;">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
                JTP Logistics · El mejor socio comercial<br />
                Este correo es automático, por favor no lo respondas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
