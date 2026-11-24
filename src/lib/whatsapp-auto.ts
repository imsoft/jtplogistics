/**
 * Envío automático de WhatsApp al cliente cuando cambia el estado de su
 * embarque. Apagado por defecto: se prende desde "WhatsApp de prueba" cuando
 * JTP ya tiene su número (con el de prueba de Meta solo llega a 5 celulares).
 *
 * Cada envío, salga o no, queda en la bitácora (recurso "whatsapp_message").
 */
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { sendWhatsApp, whatsappConfig, WhatsAppError } from "@/lib/whatsapp-server";
import { templateByName, templateMessage, whatsappNumber } from "@/lib/whatsapp-templates";
import { statusMessageFor, type StatusMessageShipment } from "@/lib/whatsapp-status-messages";

export const WHATSAPP_AUTO_KEY = "whatsapp_auto_status";
export const WHATSAPP_AUDIT_RESOURCE = "whatsapp_message";

export async function whatsappAutoEnabled(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: WHATSAPP_AUTO_KEY } });
  return row?.value === "on";
}

export async function setWhatsappAuto(on: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: WHATSAPP_AUTO_KEY },
    create: { key: WHATSAPP_AUTO_KEY, value: on ? "on" : "off" },
    update: { value: on ? "on" : "off" },
  });
}

/**
 * Avisa al cliente del nuevo estado. Nunca lanza: corre después de responder
 * (con `after`) y un WhatsApp que no sale no debe tumbar el cambio de estado.
 */
export async function notifyShipmentStatus(
  shipment: StatusMessageShipment & { id: string; client: string | null },
  actor: { id: string; name: string }
): Promise<void> {
  try {
    if (!(await whatsappAutoEnabled()) || whatsappConfig().missing.length) return;
    const clientName = shipment.client?.trim();
    if (!clientName) return;
    const client = await prisma.client.findFirst({
      where: { name: { equals: clientName, mode: "insensitive" } },
      select: { name: true, contactName: true, phone: true },
    });
    const message = statusMessageFor(shipment, client?.contactName || client?.name || clientName);
    if (!message) return;

    const to = whatsappNumber(client?.phone ?? "");
    let result: string;
    if (!to) {
      result = client ? "No se mandó: el cliente no tiene celular registrado." : "No se mandó: el cliente no está en el catálogo.";
    } else {
      try {
        await sendWhatsApp(templateMessage(to, templateByName(message.template)!, message.params));
        result = "Enviado";
      } catch (e) {
        result = `No se mandó: ${e instanceof WhatsAppError ? e.message : "error al enviar."}`;
      }
    }
    void logAudit({
      resource: WHATSAPP_AUDIT_RESOURCE,
      resourceId: shipment.id,
      resourceLabel: `${shipment.eco ?? "Embarque"} → ${client?.name ?? clientName}`,
      action: "created",
      userId: actor.id,
      userName: actor.name,
      changes: [
        { field: "template", label: "Plantilla", from: null, to: message.template },
        { field: "to", label: "Para", from: null, to: client?.phone ?? null },
        { field: "params", label: "Datos", from: null, to: message.params.join(" · ") },
        { field: "result", label: "Resultado", from: null, to: result },
      ],
    });
  } catch (e) {
    console.error("[whatsapp-auto]", e);
  }
}
