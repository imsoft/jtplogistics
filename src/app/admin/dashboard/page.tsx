import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Route } from "lucide-react";

export const metadata = {
  title: "Dashboard | JTP Logistics",
  description: "Panel de administración",
};

export default function DashboardPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
      <p className="text-muted-foreground text-sm sm:text-base">
        Bienvenido al panel de administración. Gestiona rutas y recursos desde el
        menú lateral.
      </p>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        <Button asChild>
          <Link href="/admin/dashboard/routes" className="flex items-center gap-2">
            <Route className="size-4" />
            Gestionar rutas
          </Link>
        </Button>
      </div>
    </div>
  );
}
