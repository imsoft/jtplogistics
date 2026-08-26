"use client";

import { CarrierRoutesManager } from "@/components/dashboard/carrier/carrier-routes-manager";

// Vista idéntica a la de tipos de unidad, pero CON la columna del semáforo.
// Se llega aquí desde el botón "Gestionar" del Inicio del transportista, así
// que arranca en las rutas ya pactadas: el catálogo completo se ve cambiando
// el filtro.
export default function CarrierUnitTypeGestionarPage() {
  return <CarrierRoutesManager showSemaforo defaultAgreement="agreed" />;
}
