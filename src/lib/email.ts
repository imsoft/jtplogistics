/**
 * Email sending for auth (verification, password reset).
 * Uses Resend when RESEND_API_KEY is set; otherwise logs to console (dev).
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "JTP Logistics <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailOptions): Promise<void> {
  if (resend) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
    });
    if (error) {
      console.error("[email] Resend error:", error);
      throw new Error("No se pudo enviar el correo.");
    }
    return;
  }
  // Fallback: log to console (útil en desarrollo sin RESEND_API_KEY)
  console.log("[email] (dev - no RESEND_API_KEY)");
  console.log("  To:", to);
  console.log("  Subject:", subject);
  console.log("  Text:", text);
  if (text.includes("http")) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      console.log("  [LINK PARA COPIAR]:", urlMatch[0]);
    }
  }
}
