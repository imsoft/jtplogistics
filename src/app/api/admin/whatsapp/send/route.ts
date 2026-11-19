import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { renderTrackingImage } from "@/lib/tracking-image";
import { trackingFileName } from "@/lib/shipment-tracking";
import { prisma } from "@/lib/db";
import {
  imageMessage,
  missingParams,
  templateByName,
  templateMessage,
  textMessage,
  whatsappNumber,
} from "@/lib/whatsapp-templates";
import { WhatsAppError, sendWhatsApp, uploadWhatsAppMedia } from "@/lib/whatsapp-server";

/**
 * POST /api/admin/whatsapp/send — manda un WhatsApp de prueba (dirección y
 * soporte de TI).
 *  { to, kind: "template", template, params[] }
 *  { to, kind: "text", text }
 *  { to, kind: "image", shipmentId, caption }  → la imagen de seguimiento del embarque
 * El texto libre y la imagen solo llegan si esa persona escribió al número en
 * las últimas 24 horas (regla de WhatsApp).
 */
export function POST(request: Request) {
  return adminOrDeveloperHandler(async () => {
    const body = (await request.json().catch(() => ({}))) as {
      to?: string;
      kind?: string;
      template?: string;
      params?: string[];
      text?: string;
      shipmentId?: string;
      caption?: string;
    };
    const to = whatsappNumber(body.to ?? "");
    if (!to) return Response.json({ error: "Escribe un número de celular válido (10 dígitos, o con lada de país)." }, { status: 400 });

    try {
      let payload: object;
      if (body.kind === "template") {
        const t = templateByName(body.template ?? "");
        if (!t) return Response.json({ error: "Elige una plantilla." }, { status: 400 });
        const params = Array.isArray(body.params) ? body.params.map(String) : [];
        const missing = missingParams(t, params);
        if (missing.length) return Response.json({ error: `Falta llenar: ${missing.join(", ")}.` }, { status: 400 });
        payload = templateMessage(to, t, params);
      } else if (body.kind === "text") {
        const text = (body.text ?? "").trim();
        if (!text) return Response.json({ error: "Escribe el mensaje." }, { status: 400 });
        payload = textMessage(to, text.toUpperCase());
      } else if (body.kind === "image") {
        if (!body.shipmentId) return Response.json({ error: "Elige un embarque." }, { status: 400 });
        const image = await renderTrackingImage(body.shipmentId, request.url);
        if (!image) return Response.json({ error: "No se encontró el embarque." }, { status: 404 });
        const s = await prisma.shipment.findUnique({ where: { id: body.shipmentId }, select: { eco: true } });
        const mediaId = await uploadWhatsAppMedia(await image.arrayBuffer(), "image/png", trackingFileName(s?.eco));
        payload = imageMessage(to, mediaId, (body.caption ?? "").toUpperCase());
      } else {
        return Response.json({ error: "Tipo de mensaje no válido." }, { status: 400 });
      }

      const messageId = await sendWhatsApp(payload);
      return Response.json({ ok: true, to, messageId });
    } catch (e) {
      if (e instanceof WhatsAppError) return Response.json({ error: e.message, code: e.code ?? null }, { status: e.status });
      throw e;
    }
  });
}
