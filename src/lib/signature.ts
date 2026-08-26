/**
 * Firma electrónica de los colaboradores de JTP.
 *
 * Se arma con tablas y estilos en línea, igual que los correos: Outlook y
 * Gmail tiran cualquier hoja de estilo al pegar. Los colores son los de la
 * plataforma, tomados de `BRAND` para que firma, correos y app se vean iguales.
 */

import { BRAND, escapeHtml } from "@/lib/email-layout";
import { formatPhone, titleCase } from "@/lib/utils";

/** Oficinas de JTP, en el orden en que van en la firma. */
export const OFFICES = ["Guadalajara", "Querétaro", "Mérida", "Laredo", "Shanghái"];

/** Conmutador de la empresa: es el mismo para todo el equipo. */
export const SWITCHBOARD = "+52 33 8852 0775";

export const WEBSITE = "www.jtp.com.mx";

const CONFIDENTIALITY =
  "CONFIDENTIALITY NOTICE: This message is from JTP and may contain confidential business information. " +
  "It is intended solely for the use of the individual to whom it is addressed. If you are not the intended " +
  "recipient please contact the sender and delete this message and any attachment from your system. " +
  "Unauthorized publication, use, dissemination, forwarding, printing or copying of this E-Mail and its " +
  "attachments is strictly prohibited.";

export interface SignaturePerson {
  name: string;
  email: string;
  position?: string | null;
  department?: string | null;
  /** Celular de la persona. */
  phone?: string | null;
}

export interface SignatureOptions {
  /** URL pública donde vive el logo; debe ser absoluta para verse en el correo. */
  logoUrl: string;
}

/** Una línea de contacto: etiqueta discreta y valor legible. */
function contactRow(label: string, value: string, href?: string): string {
  const content = href
    ? `<a href="${href}" style="color:${BRAND.text};text-decoration:none;">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<tr>
  <td style="padding:1px 10px 1px 0;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:1px 0;font-size:13px;color:${BRAND.text};">${content}</td>
</tr>`;
}

/** HTML de la firma, listo para pegar en Outlook o Gmail. */
export function buildSignature(person: SignaturePerson, options: SignatureOptions): string {
  const name = titleCase(person.name);
  const position = person.position?.trim() ? person.position.trim().toUpperCase() : null;
  const department = person.department?.trim() ? person.department.trim().toUpperCase() : null;
  const cell = formatPhone(person.phone);

  const role = [position, department].filter(Boolean).join(" · ");

  const contacts = [
    cell ? contactRow("Cel", cell, `tel:+52${cell.replace(/\D/g, "")}`) : "",
    contactRow("Tel", SWITCHBOARD, `tel:${SWITCHBOARD.replace(/\s/g, "")}`),
    contactRow("Mail", person.email, `mailto:${person.email}`),
    contactRow("Web", WEBSITE, `https://${WEBSITE}`),
  ].join("");

  const offices = OFFICES.map(
    (city) =>
      `<span style="display:inline-block;padding:0 7px;font-size:10px;font-weight:700;letter-spacing:.1em;color:${BRAND.onBlue};">${escapeHtml(city.toUpperCase())}</span>`
  ).join(`<span style="color:rgba(239,246,255,.45);font-size:10px;">|</span>`);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;">
  <tr>
    <td style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <!-- Logo -->
          <td style="padding:0 24px 0 0;vertical-align:middle;">
            <img src="${options.logoUrl}" width="118" alt="JTP Logistics" style="display:block;width:118px;height:auto;border:0;" />
          </td>
          <!-- Datos -->
          <td style="padding:2px 0 2px 4px;vertical-align:middle;">
            <p style="margin:0 0 1px;font-size:17px;font-weight:700;color:${BRAND.blue};letter-spacing:.01em;">${escapeHtml(name)}</p>
            ${
              role
                ? `<p style="margin:0 0 9px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(role)}</p>`
                : `<p style="margin:0 0 9px;"></p>`
            }
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              ${contacts}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Oficinas -->
  <tr>
    <td style="padding:14px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="background:${BRAND.blue};border-radius:8px;padding:7px 10px;">
            ${offices}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Aviso legal -->
  <tr>
    <td style="padding:10px 0 0;">
      <p style="margin:0;font-size:8.5px;line-height:1.5;color:${BRAND.muted};text-align:justify;">
        ${CONFIDENTIALITY}
      </p>
    </td>
  </tr>
</table>`;
}
