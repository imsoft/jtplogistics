"use client";

import { CarrierRoutesManager } from "@/components/dashboard/carrier/carrier-routes-manager";

// Vista de selección/edición de rutas SIN la columna del semáforo.
export default function CarrierUnitTypePage() {
  return <CarrierRoutesManager showSemaforo={false} />;
}
