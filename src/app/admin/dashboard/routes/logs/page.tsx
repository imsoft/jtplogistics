import { requireAdmin } from "@/lib/auth-server";
import { AuditLogTable } from "@/components/dashboard/audit/audit-log-table";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Historial de cambios | JTP Logistics",
};

export default async function AuditLogsPage() {
  await requireAdmin();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Historial de cambios</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Todos los cambios registrados en la plataforma: creaciones, modificaciones y eliminaciones.
        </p>
      </div>
      <Separator />
      <AuditLogTable />
    </div>
  );
}
