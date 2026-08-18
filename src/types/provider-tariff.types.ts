/** Una fila del tarifario: la ruta tal como se pactó con el proveedor. */
export interface ProviderTariffRow {
  origin: string;
  destination: string;
  /** Target del proveedor. Sin él la ruta no se puede tarifar. */
  cost: number;
  unitLabel: string;
  /** Condición pactada para esa ruta ("grado alimenticio", "caja limpia"…). */
  terms: string | null;
}

export interface ProviderTariffData {
  /** Razón social del proveedor; si no la tiene, su nombre en la plataforma. */
  legalName: string;
  /** Persona de contacto del proveedor. */
  contact: string;
  /** Correo del contacto. Opcional: no todos los proveedores lo tienen. */
  email?: string | null;
  /** Teléfono del contacto. */
  phone?: string | null;
  /** "YYYY-MM-DD": hasta cuándo se sostienen las tarifas. */
  validUntil: string;
  rows: ProviderTariffRow[];
}
