/**
 * User roles (stored in DB in English).
 * Display labels can be localized in the UI.
 */

export const USER_ROLES = ["admin", "carrier", "collaborator", "vendedor"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
