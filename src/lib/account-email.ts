/**
 * Correos de cuenta (contraseña). Viven aparte de `auth.ts` para poder armarlos
 * sin arrancar Better Auth: así la pantalla de correos de prueba manda
 * exactamente el mismo mensaje que recibe una persona de verdad.
 */

import { brandedEmail, escapeHtml } from "@/lib/email-layout";
import { firstName } from "@/lib/celebration-email";
import type { BuiltEmail } from "@/lib/celebration-email";

export function buildPasswordResetEmail(input: { name: string; url: string }): BuiltEmail {
  const name = firstName(input.name);

  return {
    subject: "Restablecer contraseña - JTP Logistics",
    html: brandedEmail({
      preheader: "El enlace expira en 1 hora.",
      eyebrow: "Tu cuenta",
      heading: "Restablecer contraseña",
      paragraphs: [
        `Hola <strong>${escapeHtml(name)}</strong>,`,
        "Recibimos una solicitud para cambiar la contraseña de tu cuenta en JTP Logistics. Usa el botón para elegir una nueva.",
      ],
      highlight:
        "El enlace expira en 1 hora. Si no pediste este cambio, ignora este correo: tu contraseña sigue igual.",
      ctaLabel: "Restablecer contraseña",
      ctaHref: input.url,
    }),
    text: [
      `Hola ${name},`,
      "",
      "Para restablecer tu contraseña, abre el siguiente enlace:",
      "",
      input.url,
      "",
      "El enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.",
      "",
      "— JTP Logistics",
    ].join("\n"),
  };
}
