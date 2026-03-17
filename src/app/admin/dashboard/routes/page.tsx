import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoutesCrud } from "@/components/dashboard/routes/routes-crud";

export const metadata = {
  title: "Rutas | JTP Logistics",
  description: "Gestionar rutas de logística",
};

export default function RoutesPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rutas</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Crea, edita y elimina rutas de entrega. Los datos se guardan en la base de datos.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/admin/dashboard/routes/new">
            <Plus className="size-4" />
            Nueva ruta
          </Link>
        </Button>
      </div>
      <Separator />
      <RoutesCrud />
    </div>
  );
}
