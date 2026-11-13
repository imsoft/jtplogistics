/**
 * Protección contra bots (Vercel BotID) en las pantallas públicas: iniciar
 * sesión, registrarse y recuperar la contraseña.
 *
 * Modo (variable de entorno BOTID_MODE):
 *  - "monitor" (por omisión): revisa y lo deja en los logs, pero no bloquea.
 *  - "enforce": bloquea a los bots (403).
 *  - "off": no revisa.
 * Se empieza en "monitor" para confirmar en producción que las personas pasan
 * antes de bloquear: si algo fallara, bloquearía también a la gente.
 *
 * Puro, para poder probarlo.
 */

/** Rutas protegidas (las mismas en el navegador y en el servidor). */
export const BOT_PROTECTED_AUTH_PATHS = [
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
] as const;

export type BotIdMode = "monitor" | "enforce" | "off";

export function botIdMode(env: string | undefined): BotIdMode {
  const v = (env ?? "").trim().toLowerCase();
  return v === "enforce" || v === "off" ? v : "monitor";
}

export function isBotProtectedPath(pathname: string): boolean {
  return (BOT_PROTECTED_AUTH_PATHS as readonly string[]).includes(pathname.replace(/\/+$/, ""));
}
