/**
 * Plantillas de WhatsApp de JTP y cómo se arma cada mensaje para la API de
 * WhatsApp (Meta Cloud API). WhatsApp solo deja que la empresa escriba primero
 * con plantillas aprobadas; el texto libre y las imágenes sueltas solo se
 * entregan si el cliente escribió en las últimas 24 horas.
 *
 * Todo en mayúsculas: decisión del cliente (interfaz, PDF, correos y mensajes).
 *
 * Puro, para poder probarlo.
 */

export interface WhatsAppTemplateDef {
  /** Nombre en Meta: minúsculas y guiones bajos. */
  name: string;
  /** Cómo se llama en la página de pruebas. */
  title: string;
  language: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  /** Cuerpo con {{1}}, {{2}}…; vacío si es una plantilla de Meta. */
  body: string;
  /** Qué va en cada variable, en orden. */
  params: string[];
  /** Valores de ejemplo que Meta pide para revisarla. */
  example: string[];
  /** De Meta (ya aprobada, no se registra). */
  builtIn?: boolean;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateDef[] = [
  {
    name: "hello_world",
    title: "Hello World (de Meta, ya aprobada)",
    language: "en_US",
    category: "UTILITY",
    body: "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.",
    params: [],
    example: [],
    builtIn: true,
  },
  {
    name: "jtp_seguimiento_embarque",
    title: "Seguimiento del embarque (cambio de estado)",
    language: "es_MX",
    category: "UTILITY",
    body: "HOLA, {{1}}. TU EMBARQUE {{2}} ({{3}}) TIENE UNA ACTUALIZACIÓN: {{4}}. TE AVISAREMOS DE CADA CAMBIO. JTP LOGISTICS.",
    params: ["Cliente", "ECO", "Ruta", "Estado"],
    example: ["OMNIGREEN", "J-16353", "CUAUTITLÁN - ORIZABA", "UNIDAD EN RUTA"],
  },
  {
    name: "jtp_embarque_retraso",
    title: "Retraso del embarque",
    language: "es_MX",
    category: "UTILITY",
    body: "HOLA, {{1}}. TU EMBARQUE {{2}} PRESENTA UN RETRASO: {{3}}. NUESTRO EQUIPO LE DA SEGUIMIENTO Y TE AVISAREMOS EN CUANTO AVANCE. JTP LOGISTICS.",
    params: ["Cliente", "ECO", "Motivo"],
    example: ["OMNIGREEN", "J-16353", "UNIDAD EN RETRASO POR TRÁFICO"],
  },
  {
    name: "jtp_embarque_entregado",
    title: "Embarque entregado",
    language: "es_MX",
    category: "UTILITY",
    body: "HOLA, {{1}}. TU EMBARQUE {{2}} FUE ENTREGADO EN {{3}}. GRACIAS POR CONFIAR EN JTP LOGISTICS. EN BREVE TE ENVIAREMOS LAS EVIDENCIAS DE ENTREGA.",
    params: ["Cliente", "ECO", "Destino"],
    example: ["OMNIGREEN", "J-16353", "ORIZABA"],
  },
];

export function templateByName(name: string): WhatsAppTemplateDef | undefined {
  return WHATSAPP_TEMPLATES.find((t) => t.name === name);
}

/**
 * Número para WhatsApp: solo dígitos y con lada de país. 10 dígitos → México
 * ("52" + número). "33-3410-9866" → "523334109866". Vacío o muy corto → null.
 */
export function whatsappNumber(input: string): string | null {
  const d = (input ?? "").replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

/** El cuerpo con las variables puestas (para la vista previa). */
export function fillTemplate(body: string, values: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => {
    const v = values[Number(n) - 1]?.trim();
    return v ? v.toUpperCase() : `{{${n}}}`;
  });
}

/** Lo que falta para poder mandarla: variables vacías, en palabras. */
export function missingParams(t: WhatsAppTemplateDef, values: string[]): string[] {
  return t.params.filter((_, i) => !values[i]?.trim());
}

/** Mensaje de plantilla para la API de Meta. */
export function templateMessage(to: string, t: WhatsAppTemplateDef, values: string[]) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: t.name,
      language: { code: t.language },
      ...(t.params.length
        ? {
            components: [
              {
                type: "body",
                parameters: t.params.map((_, i) => ({ type: "text", text: (values[i] ?? "").trim().toUpperCase().slice(0, 300) })),
              },
            ],
          }
        : {}),
    },
  };
}

/** Texto libre (solo llega si el cliente escribió en las últimas 24 horas). */
export function textMessage(to: string, text: string) {
  return { messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4096) } };
}

/** Imagen ya subida a Meta (por su id), con texto al pie. Misma regla de 24 horas. */
export function imageMessage(to: string, mediaId: string, caption: string) {
  return { messaging_product: "whatsapp", to, type: "image", image: { id: mediaId, ...(caption.trim() ? { caption: caption.slice(0, 1024) } : {}) } };
}

/** Cómo se registra una plantilla de JTP en Meta. */
export function templateCreateBody(t: WhatsAppTemplateDef) {
  return {
    name: t.name,
    language: t.language,
    category: t.category,
    components: [
      {
        type: "BODY",
        text: t.body,
        ...(t.example.length ? { example: { body_text: [t.example] } } : {}),
      },
    ],
  };
}

/** Errores frecuentes de Meta, explicados en español. */
export function explainWhatsAppError(code: number | undefined, fallback: string): string {
  switch (code) {
    case 131030:
      return "Ese número no está en la lista de números de prueba. Agrégalo en Meta (Paso 1, campo \"Para\") y confírmalo con el código.";
    case 131047:
      return "Pasaron más de 24 horas desde que esa persona escribió: el texto libre y las imágenes no llegan. Usa una plantilla, o que escriba primero al número de prueba.";
    case 132001:
      return "La plantilla no existe o todavía no está aprobada en ese idioma.";
    case 132000:
      return "El número de variables no coincide con la plantilla.";
    case 190:
      return "El token de acceso venció o no es válido. Genera uno nuevo (de preferencia, el permanente del usuario del sistema).";
    case 100:
      return `Meta rechazó la solicitud: ${fallback}`;
    default:
      return fallback;
  }
}
