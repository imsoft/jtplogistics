export interface IncidentTypeDef {
  id: string;
  name: string;
  /** Clave de INCIDENT_COLORS; null = gris. */
  color?: string | null;
  value: string;
  sortOrder: number;
  createdAt: string;
}
