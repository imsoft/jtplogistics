import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { RouteLogTable } from "@/components/dashboard/routes/route-log-table";

export const metadata = {
  title: "Historial de Cambios | JTP Logistics",
  description: "Ver historial de cambios",
};

/**
 * Antes esta pantalla solo decía "Sección de historial de cambios." y no
 * mostraba nada, aunque la API del colaborador ya existía. El permiso lo
 * revisa esa API.
 */
export default function CollaboratorRouteLogsPage() {
  return (
    <ResourceListPage
      title="Historial de cambios"
      description="Registro de todos los cambios realizados en rutas."
    >
      <RouteLogTable apiEndpoint="/api/collaborator/route-logs" />
    </ResourceListPage>
  );
}
