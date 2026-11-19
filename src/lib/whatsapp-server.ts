/**
 * Conexión con la API de WhatsApp de Meta (Cloud API). Solo servidor: el
 * token nunca sale al navegador.
 *
 * Variables de entorno:
 *  - WHATSAPP_PHONE_NUMBER_ID      número que envía (el de prueba, por ahora)
 *  - WHATSAPP_BUSINESS_ACCOUNT_ID  cuenta de WhatsApp (plantillas)
 *  - WHATSAPP_ACCESS_TOKEN         token (de preferencia el permanente)
 *  - WHATSAPP_GRAPH_VERSION        opcional, por omisión v23.0
 */
import { explainWhatsAppError } from "@/lib/whatsapp-templates";

const GRAPH = "https://graph.facebook.com";

export function whatsappConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ?? "";
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const version = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v23.0";
  const missing = [
    !phoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
    !businessAccountId && "WHATSAPP_BUSINESS_ACCOUNT_ID",
    !token && "WHATSAPP_ACCESS_TOKEN",
  ].filter(Boolean) as string[];
  return { phoneNumberId, businessAccountId, token, version, missing };
}

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public code?: number,
    public status = 502
  ) {
    super(message);
  }
}

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = whatsappConfig();
  if (cfg.missing.length) throw new WhatsAppError(`Falta configurar: ${cfg.missing.join(", ")}.`, undefined, 400);
  const res = await fetch(`${GRAPH}/${cfg.version}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string; code?: number; error_data?: { details?: string } } } & T;
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    const raw = e.error_user_msg || e.error_data?.details || e.message || `Error ${res.status} de Meta`;
    throw new WhatsAppError(explainWhatsAppError(e.code, raw), e.code);
  }
  return data;
}

/** Manda un mensaje ya armado (ver whatsapp-templates.ts). Devuelve el id de Meta. */
export async function sendWhatsApp(payload: object): Promise<string> {
  const { phoneNumberId } = whatsappConfig();
  const data = await graph<{ messages?: { id: string }[] }>(`${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.messages?.[0]?.id ?? "";
}

/** Sube una imagen a Meta para mandarla después por su id. */
export async function uploadWhatsAppMedia(data: ArrayBuffer, mime: string, fileName: string): Promise<string> {
  const { phoneNumberId } = whatsappConfig();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([data], { type: mime }), fileName);
  const res = await graph<{ id: string }>(`${phoneNumberId}/media`, { method: "POST", body: form });
  return res.id;
}

export interface MetaTemplate {
  name: string;
  status: string;
  language: string;
  category: string;
}

/** Las plantillas registradas en la cuenta de WhatsApp, con su estado de revisión. */
export async function listWhatsAppTemplates(): Promise<MetaTemplate[]> {
  const { businessAccountId } = whatsappConfig();
  const data = await graph<{ data?: MetaTemplate[] }>(`${businessAccountId}/message_templates?fields=name,status,language,category&limit=100`);
  return (data.data ?? []).map((t) => ({ name: t.name, status: t.status, language: t.language, category: t.category }));
}

/** Registra una plantilla para que Meta la revise. */
export async function createWhatsAppTemplate(body: object): Promise<{ id: string; status: string }> {
  const { businessAccountId } = whatsappConfig();
  return graph<{ id: string; status: string }>(`${businessAccountId}/message_templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
