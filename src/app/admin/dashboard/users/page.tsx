import { Separator } from "@/components/ui/separator";
import { UsersTable } from "@/components/dashboard/users/users-table";

export const metadata = {
  title: "Usuarios | JTP Logistics",
  description: "Ver usuarios registrados en la aplicación",
};

export default function UsersPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Usuarios
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Usuarios registrados en la aplicación. Puedes filtrar por nombre,
          correo o rol.
        </p>
      </div>
      <Separator />
      <UsersTable />
    </div>
  );
}
