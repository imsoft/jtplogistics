/**
 * Correos que reciben los transportistas y el equipo de pricing. Se arman con
 * la misma plantilla de marca que el resto para que todo lo que manda la
 * plataforma se vea igual.
 */

import { brandedEmail, escapeHtml } from "@/lib/email-layout";
import { firstName } from "@/lib/celebration-email";
import type { BuiltEmail } from "@/lib/celebration-email";

export function buildNewRouteEmail(input: {
  name: string;
  routeLabel: string;
  /** Estado del destino, si se conoce. */
  state?: string | null;
  href?: string;
}): BuiltEmail {
  const name = firstName(input.name);
  const label = `${input.routeLabel}${input.state ? ` (${input.state})` : ""}`;

  return {
    subject: `Nueva ruta disponible: ${input.routeLabel}`,
    html: brandedEmail({
      preheader: `${label} coincide con tu perfil operativo.`,
      eyebrow: "Rutas JTP Logistics",
      heading: "Nueva ruta disponible",
      paragraphs: [
        `Hola <strong>${escapeHtml(name)}</strong>,`,
        "Se publicó una nueva ruta que coincide con tu perfil operativo.",
      ],
      highlight: `<strong style="font-size:16px;">${escapeHtml(label)}</strong>`,
      ctaLabel: "Ver rutas disponibles",
      ctaHref: input.href || undefined,
    }),
    text: [
      `Hola ${name},`,
      "",
      "Se publicó una nueva ruta que coincide con tu perfil operativo:",
      "",
      label,
      "",
      "Ingresa a la plataforma para conocer más detalles.",
      ...(input.href ? [input.href] : []),
      "",
      "JTP Logistics",
    ].join("\n"),
  };
}

export interface BidRouteLine {
  origin: string;
  destination: string;
  target: string;
  volume: string;
}

/** Aviso a pricing de que un proveedor guardó o cambió su licitación. */
export function buildCarrierBidEmail(input: {
  carrierName: string;
  carrierEmail: string;
  when: string;
  routes: BidRouteLine[];
  href?: string;
}): BuiltEmail {
  const rows = input.routes
    .map(
      (r) => `<tr>
  <td style="padding:8px 10px;border-bottom:1px solid #D7DFEE;font-size:13px;">${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</td>
  <td style="padding:8px 10px;border-bottom:1px solid #D7DFEE;font-size:13px;text-align:right;white-space:nowrap;">${escapeHtml(r.target)}</td>
  <td style="padding:8px 10px;border-bottom:1px solid #D7DFEE;font-size:13px;text-align:right;">${escapeHtml(r.volume)}</td>
</tr>`
    )
    .join("");

  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;border-collapse:collapse;">
  <tr>
    <th align="left" style="padding:8px 10px;border-bottom:2px solid #1447E6;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#57637D;">Ruta</th>
    <th align="right" style="padding:8px 10px;border-bottom:2px solid #1447E6;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#57637D;">Target</th>
    <th align="right" style="padding:8px 10px;border-bottom:2px solid #1447E6;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#57637D;">Volumen</th>
  </tr>
  ${rows}
</table>`;

  return {
    subject: `Licitación actualizada — ${input.carrierName}`,
    html: brandedEmail({
      preheader: `${input.routes.length} ruta(s) · ${input.carrierName}`,
      eyebrow: "Pricing JTP Logistics",
      heading: "Licitación actualizada",
      paragraphs: [
        `El proveedor <strong>${escapeHtml(input.carrierName)}</strong> (${escapeHtml(input.carrierEmail)}) guardó o actualizó su licitación el ${escapeHtml(input.when)}.`,
        `<strong>Rutas (${input.routes.length}):</strong>`,
        table,
      ],
      ctaLabel: input.href ? "Ver en la plataforma" : undefined,
      ctaHref: input.href || undefined,
    }),
    text: [
      `El proveedor ${input.carrierName} (${input.carrierEmail}) guardó o actualizó su licitación el ${input.when}.`,
      "",
      `Rutas (${input.routes.length}):`,
      ...input.routes.map(
        (r) => `• ${r.origin} → ${r.destination} | Target: ${r.target} | Volumen: ${r.volume}`
      ),
    ].join("\n"),
  };
}
