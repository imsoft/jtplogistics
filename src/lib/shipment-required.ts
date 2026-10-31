/**
 * Campos básicos de un embarque: sin ellos no se proponen tarifas ni
 * direcciones. El transportista no entra: muchas veces se asigna después.
 * Lo usan el formulario y la API, para que exijan exactamente lo mismo.
 */
export const SHIPMENT_REQUIRED_FIELDS = [
  { key: "client", label: "cliente" },
  { key: "origin", label: "origen" },
  { key: "destination", label: "destino" },
  { key: "unit", label: "tipo de unidad" },
] as const;

/** Las etiquetas de los básicos que vienen vacíos. */
export function missingShipmentFields(data: Partial<Record<(typeof SHIPMENT_REQUIRED_FIELDS)[number]["key"], unknown>>): string[] {
  return SHIPMENT_REQUIRED_FIELDS.filter(({ key }) => {
    const v = data[key];
    return typeof v !== "string" || !v.trim();
  }).map(({ label }) => label);
}

/** "Falta el cliente." / "Faltan origen, destino y tipo de unidad." */
export function missingShipmentMessage(missing: string[]): string {
  if (missing.length === 0) return "";
  // Todas las etiquetas son masculinas: "el cliente", "el tipo de unidad".
  if (missing.length === 1) return `Falta el ${missing[0]}.`;
  return `Faltan ${missing.slice(0, -1).join(", ")} y ${missing[missing.length - 1]}.`;
}
