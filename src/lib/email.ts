/**
 * Envío de correo de la plataforma. Usa Resend cuando hay RESEND_API_KEY; si no,
 * escribe en consola (desarrollo).
 */

import { Resend } from "resend";
import { uppercaseEmailHtml, uppercaseEmailText } from "@/lib/email-uppercase";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "JTP Logistics <onboarding@resend.dev>";

export interface EmailAttachment {
  filename: string;
  /** Contenido del archivo en base64, sin el prefijo `data:`. */
  content: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Remitente. Por defecto, el de la plataforma (EMAIL_FROM). */
  from?: string;
  /** A dónde van las respuestas, si es distinto del remitente. */
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/**
 * Error de envío que conserva el motivo de Resend. `domainNotVerified` permite
 * a quien llama reaccionar (por ejemplo, reintentar con otro remitente) sin
 * tener que leer el texto del mensaje.
 */
export class EmailSendError extends Error {
  readonly domainNotVerified: boolean;

  constructor(message: string, domainNotVerified: boolean) {
    super(message);
    this.name = "EmailSendError";
    this.domainNotVerified = domainNotVerified;
  }
}

export async function sendEmail({
  to,
  subject: rawSubject,
  text: rawText,
  html: rawHtml,
  from,
  replyTo,
  attachments,
}: SendEmailOptions): Promise<void> {
  // Toda la plataforma va en mayúsculas y los correos no son la excepción. Se
  // hace aquí, en el único punto de salida, para que ningún correo se escape.
  const subject = uppercaseEmailText(rawSubject);
  const text = uppercaseEmailText(rawText);
  const html = rawHtml ? uppercaseEmailHtml(rawHtml) : undefined;

  if (resend) {
    const { error } = await resend.emails.send({
      from: from ?? DEFAULT_FROM,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });
    if (error) {
      console.error("[email] Resend error:", error);
      const message = error.message ?? error.name;
      // El motivo viaja en el error: sin él, un dominio sin verificar en Resend
      // es indistinguible de una caída y no hay forma de saber qué arreglar.
      throw new EmailSendError(
        `No se pudo enviar el correo: ${message}`,
        /domain is not verified/i.test(message)
      );
    }
    return;
  }
  // Respaldo: consola (útil en desarrollo sin RESEND_API_KEY)
  console.log("[email] (dev - no RESEND_API_KEY)");
  console.log("  From:", from ?? DEFAULT_FROM);
  console.log("  To:", to);
  console.log("  Subject:", subject);
  console.log("  Text:", text);
  if (attachments?.length) {
    console.log("  Adjuntos:", attachments.map((a) => a.filename).join(", "));
  }
  if (text.includes("http")) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      console.log("  [LINK PARA COPIAR]:", urlMatch[0]);
    }
  }
}
