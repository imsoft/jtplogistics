import { Separator } from "@/components/ui/separator";
import { UsersTable } from "@/components/dashboard/users/users-table";

export const metadata = {
  title: "Proveedores | JTP Logistics",
  description: "Ver proveedores (transportistas) registrados",
};

export default function ProvidersPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Proveedores
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Transportistas registrados en la plataforma.
        </p>
      </div>
      <Separator />
      <UsersTable defaultRole="carrier" />
    </div>
  );
}
