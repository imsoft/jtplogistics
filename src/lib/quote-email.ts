/**
 * Correo con el que se manda una cotización al cliente. Lo firma el ejecutivo
 * que la generó, no "la plataforma".
 */

import { brandedEmail, escapeHtml } from "@/lib/email-layout";
import { titleCase } from "@/lib/utils";
import type { BuiltEmail } from "@/lib/celebration-email";

export interface QuoteEmailInput {
  quoteNumber: string;
  company: string;
  contact: string;
  /** "YYYY-MM-DD" hasta cuándo se sostienen los precios. */
  validUntil: string;
  /** Quien manda la cotización. */
  senderName: string;
  senderPosition?: string | null;
  /** Nota opcional que escribe el ejecutivo antes de enviar. */
  message?: string | null;
}

function formatValidUntil(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${months[m - 1]} de ${y}`;
}

export function buildQuoteEmail(input: QuoteEmailInput): BuiltEmail {
  const contact = titleCase(input.contact);
  const validity = formatValidUntil(input.validUntil);
  const signature = input.senderPosition
    ? `${input.senderName} · ${input.senderPosition.toLowerCase()}`
    : input.senderName;

  const paragraphs = [
    `Hola <strong>${escapeHtml(contact)}</strong>,`,
    `Te comparto la cotización <strong>${escapeHtml(input.quoteNumber)}</strong> para ${escapeHtml(input.company)}. La encuentras en el PDF adjunto.`,
    ...(input.message?.trim() ? [escapeHtml(input.message.trim())] : []),
    "Quedo al pendiente de cualquier duda: puedes responder directamente a este correo.",
    `<strong>${escapeHtml(signature)}</strong>`,
  ];

  return {
    subject: `Cotización ${input.quoteNumber} · JTP Logistics`,
    html: brandedEmail({
      preheader: validity ? `Vigencia al ${validity}` : undefined,
      eyebrow: "Cotización JTP Logistics",
      heading: `Cotización ${input.quoteNumber}`,
      paragraphs,
      highlight: validity
        ? `Los precios de esta cotización tienen vigencia al <strong>${escapeHtml(validity)}</strong>.`
        : undefined,
    }),
    text: [
      `Hola ${contact},`,
      "",
      `Te comparto la cotización ${input.quoteNumber} para ${input.company}. La encuentras en el PDF adjunto.`,
      ...(input.message?.trim() ? ["", input.message.trim()] : []),
      ...(validity ? ["", `Vigencia al ${validity}.`] : []),
      "",
      "Quedo al pendiente de cualquier duda: puedes responder directamente a este correo.",
      "",
      signature,
      "JTP Logistics",
    ].join("\n"),
  };
}
