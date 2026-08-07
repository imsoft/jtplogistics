/**
 * Catálogo de correos de la plataforma con datos de ejemplo, para que un admin
 * pueda mandárselos a sí mismo y ver cómo llegan a la bandeja.
 *
 * Cada demo arma su contenido con la misma plantilla que el correo de verdad
 * (`brandedEmail`, `buildCelebrationEmail`…), así que un cambio de estilo se ve
 * aquí igual que en producción. Lo que sí es de mentira son los datos: nombres,
 * rutas y fechas son inventados.
 */

import { brandedEmail, escapeHtml, appUrl } from "@/lib/email-layout";
import { buildCelebrationEmail } from "@/lib/celebration-email";
import { buildNewRouteEmail, buildCarrierBidEmail } from "@/lib/carrier-email";
import { buildPasswordResetEmail } from "@/lib/account-email";

/**
 * Un correo listo para mandar. `html` es opcional porque los correos de texto
 * plano (contraseña, licitación) no tienen versión maquetada.
 */
export interface PreviewEmail {
  subject: string;
  html?: string;
  text: string;
}

/** Persona ficticia que protagoniza las demos. */
const DEMO_NAME = "Ana Torres";
const DEMO_MURAL_PATH = "/admin/dashboard/mural";

export interface EmailPreview {
  id: string;
  /** Nombre corto para la lista. */
  label: string;
  /** Cuándo se manda y a quién, en una línea. */
  description: string;
  /** Grupo con el que se agrupa en la pantalla. */
  group: "Mural" | "Celebraciones" | "Transportistas" | "Cuenta";
  build: () => PreviewEmail;
}

function muralDemo(options: {
  subject: string;
  heading: string;
  paragraphs: string[];
  body?: string;
  ctaLabel?: string;
  path?: string;
}): PreviewEmail {
  const base = appUrl();
  const href = base ? `${base}${options.path ?? DEMO_MURAL_PATH}` : "";
  return {
    subject: options.subject,
    html: brandedEmail({
      preheader: options.body,
      eyebrow: "Mural JTP Logistics",
      heading: options.heading,
      paragraphs: [`Hola <strong>${escapeHtml(DEMO_NAME)}</strong>,`, ...options.paragraphs],
      ctaLabel: options.ctaLabel ?? "Ver en el mural",
      ctaHref: href || undefined,
    }),
    text: [
      `Hola ${DEMO_NAME},`,
      "",
      options.heading,
      ...(options.body ? ["", options.body] : []),
      ...(href ? ["", href] : []),
      "",
      "JTP Logistics",
    ].join("\n"),
  };
}

export const EMAIL_PREVIEWS: EmailPreview[] = [
  // ── Mural ──
  {
    id: "mural_entry_created",
    label: "Nueva entrada en el mural",
    description: "Al publicar un evento, capacitación o vacaciones. Va a admins y colaboradores con acceso al mural.",
    group: "Mural",
    build: () =>
      muralDemo({
        subject: "Mural JTP · Evento: Junta general de resultados",
        heading: "Junta general de resultados",
        body: "20 de agosto de 2026",
        paragraphs: [
          "Se publicó <strong>evento</strong> en el mural de JTP Logistics.",
          "<strong>Fecha:</strong> 20 de agosto de 2026",
          "<strong>Lugar:</strong> Sala de juntas 2",
          "Repasaremos los resultados del trimestre y los objetivos del cierre de año.",
        ],
      }),
  },
  {
    id: "mural_entry_updated",
    label: "Cambio en una entrada",
    description: "Cuando se mueve la fecha, el lugar, el tipo o el título de una entrada ya publicada.",
    group: "Mural",
    build: () =>
      muralDemo({
        subject: "Mural JTP · Cambio en evento: Junta general de resultados",
        heading: "Junta general de resultados",
        body: "Nueva fecha: 22 de agosto de 2026",
        paragraphs: [
          "Se actualizó <strong>evento</strong> del mural de JTP Logistics.",
          "<strong>Inicio:</strong> 20 de agosto de 2026 → 22 de agosto de 2026",
          "<strong>Lugar:</strong> Sala de juntas 2 → Auditorio",
          "<strong>Queda así:</strong> 22 de agosto de 2026 · Auditorio",
        ],
      }),
  },
  {
    id: "mural_entry_cancelled",
    label: "Entrada cancelada",
    description: "Al eliminar una entrada que todavía no ocurría.",
    group: "Mural",
    build: () =>
      muralDemo({
        subject: "Mural JTP · Se canceló evento: Junta general de resultados",
        heading: "Se canceló: Junta general de resultados",
        body: "22 de agosto de 2026",
        paragraphs: [
          "Se dio de baja <strong>evento</strong> del mural de JTP Logistics.",
          "<strong>Estaba programado:</strong> 22 de agosto de 2026",
          "<strong>Lugar:</strong> Auditorio",
        ],
      }),
  },
  {
    id: "mural_post",
    label: "Nueva noticia",
    description: "Al publicar una noticia del mural (no se manda si queda como borrador).",
    group: "Mural",
    build: () =>
      muralDemo({
        subject: "Mural JTP · Abrimos oficina en Mérida",
        heading: "Abrimos oficina en Mérida",
        body: "Ya operamos desde el sureste con equipo propio.",
        paragraphs: [
          "Se publicó una nueva noticia en el mural de JTP Logistics.",
          "Ya operamos desde el sureste con equipo propio.",
        ],
        ctaLabel: "Leer la publicación",
        path: "/admin/dashboard/mural/posts/demo",
      }),
  },
  {
    id: "mural_digest",
    label: "Resumen diario",
    description: "Cron de las 8:00 a. m. Junta las celebraciones del día y lo que arranca hoy.",
    group: "Mural",
    build: () =>
      muralDemo({
        subject: "Mural JTP · Novedades de hoy",
        heading: "Novedades del mural de hoy",
        body: "2 celebración(es) · 1 evento(s)",
        paragraphs: [
          "🎂 <strong>Mario Ruiz Salazar</strong> cumple años hoy (34).",
          "🎉 <strong>Lizeth Murrieta Hernández</strong> cumple 3 años en JTP Logistics.",
          "📌 <strong>Capacitación de seguridad vial</strong> — capacitación (7 de agosto de 2026) · Sala 1",
        ],
      }),
  },

  // ── Celebraciones ──
  {
    id: "celebration_birthday",
    label: "Felicitación de cumpleaños",
    description: "Solo a la persona que cumple años, el mismo día.",
    group: "Celebraciones",
    build: () =>
      buildCelebrationEmail({
        name: DEMO_NAME,
        kind: "birthday",
        years: 34,
        base: appUrl(),
        muralPath: DEMO_MURAL_PATH,
      }),
  },
  {
    id: "celebration_anniversary",
    label: "Felicitación de aniversario",
    description: "Solo a la persona que cumple años en la empresa.",
    group: "Celebraciones",
    build: () =>
      buildCelebrationEmail({
        name: DEMO_NAME,
        kind: "anniversary",
        years: 3,
        base: appUrl(),
        muralPath: DEMO_MURAL_PATH,
      }),
  },

  // ── Transportistas ──
  {
    id: "new_route_carrier",
    label: "Nueva ruta disponible",
    description: "A los transportistas cuyo perfil operativo coincide con una ruta recién publicada.",
    group: "Transportistas",
    build: () => {
      const base = appUrl();
      return buildNewRouteEmail({
        name: DEMO_NAME,
        routeLabel: "Guadalajara → Monterrey",
        state: "Nuevo León",
        href: base ? `${base}/carrier/dashboard/unit-types/caja_seca` : undefined,
      });
    },
  },
  {
    id: "carrier_bid_updated",
    label: "Licitación actualizada",
    description: "A pricing@jtp.com.mx cuando un transportista guarda o cambia su licitación.",
    group: "Transportistas",
    build: () =>
      buildCarrierBidEmail({
        carrierName: "Transportes del Bajío",
        carrierEmail: "contacto@transportesbajio.com",
        when: "07/08/26, 10:24",
        routes: [
          { origin: "Guadalajara", destination: "Monterrey", target: "$35,186.67", volume: "4 unid./mes" },
          { origin: "Guadalajara", destination: "Querétaro", target: "$14,970.15", volume: "2 unid./mes" },
        ],
      }),
  },

  // ── Cuenta ──
  {
    id: "password_reset",
    label: "Restablecer contraseña",
    description: "Cuando alguien pide recuperar su contraseña desde el login.",
    group: "Cuenta",
    build: () =>
      buildPasswordResetEmail({
        name: DEMO_NAME,
        url: `${appUrl() || "https://www.jtplogistics.com"}/reset-password?token=demo`,
      }),
  },
];

export function findEmailPreview(id: string): EmailPreview | undefined {
  return EMAIL_PREVIEWS.find((p) => p.id === id);
}
