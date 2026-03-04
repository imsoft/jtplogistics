/**
 * Auth helpers: role checks and session utilities.
 * Roles are stored in English: admin, carrier, collaborator.
 */

import type { UserRole } from "@/types/roles";

/**
 * Returns a valid base URL for Better Auth.
 * If BETTER_AUTH_URL lacks protocol, prepends https://.
 * (instrumentation.ts normalizes BETTER_AUTH_URL at startup before any code runs)
 */
export function getAuthBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

/**
 * All origins trusted by Better Auth (CSRF / invalid origin).
 * Includes base URL, localhost, Vercel deployment URL and BETTER_AUTH_TRUSTED_ORIGINS.
 */
export function getTrustedOrigins(): string[] {
  const origins: string[] = [getAuthBaseUrl(), "http://localhost:3000"];

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (extra) {
    origins.push(...extra.split(",").map((s) => s.trim()).filter(Boolean));
  }

  return [...new Set(origins)];
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export function hasRole(user: { role?: string | null } | null, role: UserRole): boolean {
  return user?.role === role;
}

export function isAdmin(user: { role?: string | null } | null): boolean {
  return hasRole(user, "admin");
}

export function isCarrier(user: { role?: string | null } | null): boolean {
  return hasRole(user, "carrier");
}

export function isCollaborator(user: { role?: string | null } | null): boolean {
  return hasRole(user, "collaborator");
}

export function isVendedor(user: { role?: string | null } | null): boolean {
  return hasRole(user, "vendedor");
}
