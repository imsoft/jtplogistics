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

/**
 * Aviso al colaborador de que soporte le restableció la contraseña. Lleva la
 * temporal dentro, así que solo se manda cuando quien la restablece lo pide.
 */
export function buildPasswordResetByStaffEmail(input: {
  name: string;
  password: string;
  actorName: string;
  loginUrl: string;
}): BuiltEmail {
  const name = firstName(input.name);

  return {
    subject: "Tu contraseña de JTP Logistics cambió",
    html: brandedEmail({
      preheader: "Entra con la contraseña temporal y cámbiala.",
      eyebrow: "Tu cuenta",
      heading: "Tu contraseña cambió",
      paragraphs: [
        `Hola <strong>${escapeHtml(name)}</strong>,`,
        `<strong>${escapeHtml(input.actorName)}</strong> restableció la contraseña de tu cuenta en JTP Logistics. Esta es tu contraseña temporal:`,
        `<strong style="font-size:18px;letter-spacing:.05em;">${escapeHtml(input.password)}</strong>`,
      ],
      highlight:
        "Entra con ella y cámbiala desde tu perfil en cuanto puedas. Si no esperabas este cambio, avísale a soporte de TI.",
      ctaLabel: "Entrar",
      ctaHref: input.loginUrl,
    }),
    text: [
      `Hola ${name},`,
      "",
      `${input.actorName} restableció la contraseña de tu cuenta en JTP Logistics.`,
      "",
      `Contraseña temporal: ${input.password}`,
      "",
      `Entra en ${input.loginUrl} y cámbiala desde tu perfil en cuanto puedas.`,
      "",
      "— JTP Logistics",
    ].join("\n"),
  };
}
