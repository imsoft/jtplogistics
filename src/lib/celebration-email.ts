/**
 * Correo de felicitación de cumpleaños y aniversario.
 * Módulo puro: recibe todo por parámetro para poder probarse sin BD ni red.
 */

import { brandedEmail } from "@/lib/email-layout";

export interface CelebrationEmailInput {
  name: string;
  kind: "birthday" | "anniversary";
  /** Edad o años de antigüedad. `null` cuando aún no cumple un año. */
  years: number | null;
  /** URL base de la app; sin ella se omiten logo y botón. */
  base?: string;
  /** Ruta al mural según el rol de quien recibe (admin o colaborador). */
  muralPath?: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** Primer nombre, capitalizado, para tutear sin sonar a base de datos. */
export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? fullName;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function buildCelebrationEmail(input: CelebrationEmailInput): BuiltEmail {
  const { kind, years, base, muralPath = "/collaborator/dashboard/mural" } = input;
  const name = firstName(input.name);
  const isBirthday = kind === "birthday";
  const plural = years === 1 ? "año" : "años";

  const subject = isBirthday
    ? `¡Feliz cumpleaños, ${name}! 🎂`
    : years
      ? `¡Felicidades por ${years === 1 ? "tu" : "tus"} ${years} ${plural} en JTP, ${name}! 🎉`
      : `¡Felicidades por tu aniversario en JTP, ${name}! 🎉`;

  const heading = isBirthday ? `¡Feliz cumpleaños, ${name}!` : `¡Felicidades, ${name}!`;

  const paragraphs = isBirthday
    ? [
        years
          ? `Hoy cumples <strong>${years} años</strong> y en JTP Logistics queremos ser de los primeros en felicitarte.`
          : `Hoy es tu día y en JTP Logistics queremos ser de los primeros en felicitarte.`,
        "Que este año te traiga salud, buenos viajes y muchos motivos para celebrar. Gracias por ser parte del equipo.",
      ]
    : [
        years
          ? `Hoy se cumplen <strong>${years} ${plural}</strong> desde que te uniste a JTP Logistics.`
          : "Hoy celebramos tu aniversario en JTP Logistics.",
        "Gracias por el compromiso y por todo lo que aportas al equipo cada día. Nos da mucho gusto tenerte con nosotros.",
      ];

  const highlight = isBirthday
    ? "🎂 Todo el equipo de JTP Logistics te desea un día increíble."
    : "🎉 Todo el equipo de JTP Logistics celebra contigo.";

  const html = brandedEmail({
    preheader: isBirthday
      ? `Todo el equipo de JTP te desea un feliz cumpleaños.`
      : `Gracias por estos ${years ?? ""} ${plural} en JTP Logistics.`.replace(/\s+/g, " "),
    eyebrow: isBirthday ? "Feliz cumpleaños" : "Aniversario en JTP",
    heading,
    emoji: isBirthday ? "🎂" : "🎉",
    paragraphs,
    highlight,
    ctaLabel: "Ver el mural",
    ctaHref: base ? `${base}${muralPath}` : undefined,
    base,
  });

  const text = [
    heading,
    "",
    ...paragraphs.map((p) => p.replace(/<[^>]+>/g, "")),
    "",
    highlight.replace(/[🎂🎉]\s*/g, ""),
    ...(base ? ["", `${base}${muralPath}`] : []),
    "",
    "JTP Logistics · El mejor socio comercial",
  ].join("\n");

  return { subject, html, text };
}
