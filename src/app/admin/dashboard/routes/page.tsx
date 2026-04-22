import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoutesCrud } from "@/components/dashboard/routes/routes-crud";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Rutas | JTP Logistics",
  description: "Gestionar rutas de logística",
};

export default async function RoutesPage() {
  const totalRoutes = await prisma.route.count();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading flex items-center gap-2">
            Rutas
            <span className="text-sm font-normal text-muted-foreground">({totalRoutes})</span>
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Crea, edita y elimina rutas de entrega. Los datos se guardan en la base de datos.
          </p>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-fit">
          <Button asChild variant="outline" className="flex-1 sm:flex-none" size="sm">
            <Link href="/admin/dashboard/routes/import">
              <Upload className="size-4" />
              Importar
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none" size="sm">
            <Link href="/admin/dashboard/routes/new">
              <Plus className="size-4" />
              Nueva ruta
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
      <RoutesCrud />
    </div>
  );
}
