import Link from "next/link";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard | JTP Logistics",
  description: "Tu panel de usuario",
};

export default function CarrierDashboardPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
      <p className="text-muted-foreground text-sm sm:text-base">
        Bienvenido. Aquí puedes consultar las rutas disponibles que ha configurado el administrador.
      </p>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        <Button asChild>
          <Link href="/carrier/dashboard/routes" className="flex items-center gap-2">
            <Route className="size-4" />
            Ver rutas
          </Link>
        </Button>
      </div>
    </div>
  );
}
