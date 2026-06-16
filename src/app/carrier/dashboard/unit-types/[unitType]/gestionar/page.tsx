"use client";

import { CarrierRoutesManager } from "@/components/dashboard/carrier/carrier-routes-manager";

// Vista idéntica a la de tipos de unidad, pero CON la columna del semáforo.
// Se llega aquí desde el botón "Gestionar" del Inicio del transportista.
export default function CarrierUnitTypeGestionarPage() {
  return <CarrierRoutesManager showSemaforo />;
}
