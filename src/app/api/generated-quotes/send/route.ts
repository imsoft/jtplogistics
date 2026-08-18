import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireQuoteAuthor } from "@/lib/auth-server";
import { sendEmail, EmailSendError, DEFAULT_FROM } from "@/lib/email";
import { buildQuoteEmail } from "@/lib/quote-email";
import { logAudit } from "@/lib/audit-log";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Tope del adjunto ya en base64. Un PDF de cotización pesa ~200 KB. */
const MAX_PDF_BASE64 = 6 * 1024 * 1024;

/**
 * POST /api/generated-quotes/send
 * body: { quoteNumber, to, company, contact, validUntil, pdfBase64, message? }
 *
 * Manda la cotización al cliente con el PDF adjunto. El remitente es el correo
 * de quien la envía, para que el cliente le responda a él y no a un buzón
 * automático. Si el dominio de ese correo no está verificado en Resend, se
 * reintenta con el remitente de la plataforma dejando su correo como respuesta:
 * más vale que la cotización salga a que se quede sin mandar.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireQuoteAuthor();

    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canCreateQuotes: true },
      });
      if (!me?.canCreateQuotes) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      quoteNumber?: string;
      to?: string;
      company?: string;
      contact?: string;
      validUntil?: string;
      pdfBase64?: string;
      message?: string;
    };

    const to = body.to?.trim() ?? "";
    if (!EMAIL_RE.test(to)) {
      return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
    }
    if (!body.quoteNumber || !body.company || !body.contact || !body.validUntil) {
      return Response.json({ error: "Faltan datos de la cotización." }, { status: 400 });
    }
    if (!body.pdfBase64) {
      return Response.json({ error: "Falta el PDF de la cotización." }, { status: 400 });
    }
    if (body.pdfBase64.length > MAX_PDF_BASE64) {
      return Response.json({ error: "El PDF es demasiado grande para enviarlo." }, { status: 400 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        position: true,
        employeeProfile: { select: { position: true } },
      },
    });
    const senderName = profile?.name ?? session.user.name;
    const senderEmail = profile?.email ?? session.user.email;
    const senderPosition = profile?.employeeProfile?.position ?? profile?.position ?? null;

    const { subject, html, text } = buildQuoteEmail({
      quoteNumber: body.quoteNumber,
      company: body.company,
      contact: body.contact,
      validUntil: body.validUntil,
      senderName,
      senderPosition,
      message: body.message,
    });

    const attachments = [
      { filename: `Cotizacion-${body.quoteNumber}.pdf`, content: body.pdfBase64 },
    ];

    let sentFrom = `${senderName} <${senderEmail}>`;
    let fellBack = false;

    try {
      await sendEmail({ to, subject, html, text, from: sentFrom, replyTo: senderEmail, attachments });
    } catch (e) {
      if (e instanceof EmailSendError && e.domainNotVerified) {
        // El dominio del correo del equipo no está dado de alta en Resend:
        // sale desde el remitente de la plataforma, pero las respuestas siguen
        // llegando a quien la mandó.
        console.warn(`[quotes/send] Remitente ${senderEmail} rechazado; se usa el de la plataforma.`);
        sentFrom = DEFAULT_FROM;
        fellBack = true;
        await sendEmail({ to, subject, html, text, from: sentFrom, replyTo: senderEmail, attachments });
      } else {
        throw e;
      }
    }

    void logAudit({
      resource: "generated_quote",
      resourceId: body.quoteNumber,
      resourceLabel: `${body.quoteNumber} enviada a ${to}`,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true, to, from: sentFrom, fellBack, replyTo: senderEmail });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quotes/send]", e);
    const message = e instanceof Error ? e.message : "Error interno del servidor";
    return Response.json({ error: message }, { status: 500 });
  }
}
