import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { RouteLogsTable } from "@/components/dashboard/routes/route-logs-table";

export const metadata = {
  title: "Historial de Cambios | JTP Logistics",
  description: "Ver historial de cambios",
};

export default function CollaboratorRouteLogsPage() {
  return (
    <ResourceListPage
      title="Historial de cambios"
      description="Registro de todos los cambios realizados en rutas."
    >
      <RouteLogsTable
        apiEndpoint="/api/admin/route-logs"
        detailBasePath="/collaborator/dashboard/route-logs"
      />
    </ResourceListPage>
  );
}
