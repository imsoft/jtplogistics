/** Fila de la tabla de inicio del transportista (una selección por tipo de unidad). */
export interface CarrierHomeRouteRow {
  id: string;
  routeId: string;
  origin: string;
  destination: string;
  description: string | null;
  unitType: string;
  unitTypeLabel: string;
  jtpTarget: number | null;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
}
