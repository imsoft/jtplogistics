import { FleetManager } from "@/components/dashboard/fleet/fleet-manager";

export default function CarrierFleetPage() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Unidades y operadores</h1>
        <p className="text-muted-foreground text-sm">
          Con estos datos JTP arma la Carta Porte de cada viaje que hagan para nosotros: sin
          ellos no se puede timbrar y la unidad no debe salir.
        </p>
      </div>
      <FleetManager />
    </div>
  );
}
