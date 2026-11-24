/**
 * Países de las rutas. Se guarda la clave (MX, US…) y no el nombre: así no le
 * afecta que la interfaz pase los textos a minúsculas o mayúsculas.
 */
export const COUNTRIES = [
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
  { value: "CA", label: "Canadá" },
  { value: "GT", label: "Guatemala" },
  { value: "BZ", label: "Belice" },
  { value: "SV", label: "El Salvador" },
  { value: "HN", label: "Honduras" },
  { value: "NI", label: "Nicaragua" },
  { value: "CR", label: "Costa Rica" },
  { value: "PA", label: "Panamá" },
] as const;

export const HOME_COUNTRY = "MX";

const LABELS: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.value, c.label]));

/** Clave válida del catálogo; cualquier otra cosa es México. */
export function parseCountry(v: unknown): string {
  const code = typeof v === "string" ? v.trim().toUpperCase() : "";
  return code in LABELS ? code : HOME_COUNTRY;
}

export function countryLabel(code: string | null | undefined): string {
  return LABELS[parseCountry(code)];
}

/** Una ruta es internacional si sale o llega fuera de México. */
export function isInternationalRoute(r: { originCountry?: string | null; destinationCountry?: string | null }): boolean {
  return parseCountry(r.originCountry) !== HOME_COUNTRY || parseCountry(r.destinationCountry) !== HOME_COUNTRY;
}

/** "Laredo, Estados Unidos" para lugares fuera de México; en México solo la ciudad. */
export function placeLabel(city: string, country: string | null | undefined): string {
  const code = parseCountry(country);
  return code === HOME_COUNTRY ? city : `${city}, ${LABELS[code]}`;
}

/** Filtro de Prisma: rutas nacionales o internacionales. */
export function routeScopeWhere(international: boolean) {
  return international
    ? { OR: [{ originCountry: { not: HOME_COUNTRY } }, { destinationCountry: { not: HOME_COUNTRY } }] }
    : { originCountry: HOME_COUNTRY, destinationCountry: HOME_COUNTRY };
}
