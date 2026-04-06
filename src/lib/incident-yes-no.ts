export const INCIDENT_YES_NO_OPTIONS = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
] as const;

/** Etiqueta para mostrar; texto libre antiguo se devuelve tal cual. */
export function formatIncidentYesNo(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const v = raw.toLowerCase();
  if (v === "si" || v === "sí") return "Sí";
  if (v === "no") return "No";
  return raw;
}

/** Opciones para el Select (Sí/No; si el valor guardado no es estándar, se añade una fila). */
export function getIncidentSelectOptions(incident: string) {
  const v = incident.trim();
  const isStandard = v === "" || INCIDENT_YES_NO_OPTIONS.some((o) => o.value === v);
  if (isStandard) return [...INCIDENT_YES_NO_OPTIONS];
  return [{ value: v, label: formatIncidentYesNo(v) || v }, ...INCIDENT_YES_NO_OPTIONS];
}
