/**
 * Colores para los tipos de incidencia: cada tipo elige uno en "Tipos de
 * incidencia" y su insignia sale con ese color. Tonos suaves y legibles; el
 * resto de la plataforma sigue con su paleta de 5 colores.
 */
export const INCIDENT_COLORS = [
  { key: "red", label: "Rojo", badge: "bg-red-100 text-red-800", dot: "bg-red-500" },
  { key: "orange", label: "Naranja", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  { key: "amber", label: "Ámbar", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { key: "lime", label: "Lima", badge: "bg-lime-100 text-lime-800", dot: "bg-lime-500" },
  { key: "green", label: "Verde", badge: "bg-green-100 text-green-800", dot: "bg-green-500" },
  { key: "teal", label: "Turquesa", badge: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  { key: "sky", label: "Cielo", badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  { key: "blue", label: "Azul", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-600" },
  { key: "violet", label: "Violeta", badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  { key: "pink", label: "Rosa", badge: "bg-pink-100 text-pink-800", dot: "bg-pink-500" },
  { key: "gray", label: "Gris", badge: "bg-gray-200 text-gray-800", dot: "bg-gray-500" },
] as const;

export type IncidentColorKey = (typeof INCIDENT_COLORS)[number]["key"];

export function isIncidentColor(v: unknown): v is IncidentColorKey {
  return INCIDENT_COLORS.some((c) => c.key === v);
}

/** Clases de la insignia; sin color o desconocido, gris. */
export function incidentBadgeClass(color: string | null | undefined): string {
  return (INCIDENT_COLORS.find((c) => c.key === color) ?? INCIDENT_COLORS[INCIDENT_COLORS.length - 1]).badge;
}
