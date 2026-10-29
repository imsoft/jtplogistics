import { incidentBadgeClass } from "@/lib/constants/incident-colors";

/** Tipo de incidencia con el color que se le eligió en el catálogo. */
export function IncidentTypeBadge({ value, types }: { value: string | null | undefined; types: { value: string; label: string; color?: string | null }[] }) {
  const v = value?.trim();
  if (!v) return <span className="text-muted-foreground">—</span>;
  const t = types.find((x) => x.value === v);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${incidentBadgeClass(t?.color)}`}>
      {t?.label ?? v}
    </span>
  );
}
