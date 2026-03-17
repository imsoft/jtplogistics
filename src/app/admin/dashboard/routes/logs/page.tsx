import { requireAdmin } from "@/lib/auth-server";
import { RouteLogTable } from "@/components/dashboard/routes/route-log-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Historial de rutas | JTP Logistics",
};

export default async function RouteLogsPage() {
  await requireAdmin();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/routes" aria-label="Volver a rutas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Historial de rutas</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Todos los cambios registrados en rutas: creaciones, modificaciones y eliminaciones.
          </p>
        </div>
      </div>

      <RouteLogTable />
    </div>
  );
}
