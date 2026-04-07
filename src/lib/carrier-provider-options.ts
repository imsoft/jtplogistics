import type { User } from "@/types/user.types";

/** Texto principal para identificar al transportista en listas (sin desambiguar). */
export function carrierPrimaryLabel(u: User): string {
  const p = u.profile;
  const fromProfile =
    p?.commercialName?.trim() || p?.legalName?.trim() || "";
  if (fromProfile) return fromProfile;
  const name = u.name?.trim();
  if (name) return name;
  return u.email;
}

/**
 * Etiquetas únicas para un Select (si hay colisión de nombre, se añade el correo).
 */
export function carrierProviderSelectOptions(carriers: User[]): string[] {
  const primaries = carriers.map((u) => carrierPrimaryLabel(u));
  const counts = new Map<string, number>();
  for (const p of primaries) {
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const options = carriers.map((u, i) => {
    const base = primaries[i]!;
    if ((counts.get(base) ?? 0) > 1) {
      return `${base} (${u.email})`;
    }
    return base;
  });
  return [...new Set(options)].sort((a, b) => a.localeCompare(b, "es"));
}
