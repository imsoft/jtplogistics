import { requireAdmin } from "@/lib/auth-server";
import { RouteLogTable } from "@/components/dashboard/routes/route-log-table";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Historial de rutas | JTP Logistics",
};

export default async function RouteLogsPage() {
  await requireAdmin();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Historial de rutas</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Todos los cambios registrados en rutas: creaciones, modificaciones y eliminaciones.
        </p>
      </div>
      <Separator />
      <RouteLogTable />
    </div>
  );
}
