/** Resuelve la etiqueta del catálogo; si no existe, devuelve el valor guardado (p. ej. datos antiguos). */
export function getIncidentTypeLabel(
  value: string | null | undefined,
  types: { value: string; label: string }[]
): string {
  const v = value?.trim();
  if (!v) return "";
  return types.find((t) => t.value === v)?.label ?? v;
}
