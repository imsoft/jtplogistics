import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

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
      <p className="text-muted-foreground">Sección de historial de cambios.</p>
    </ResourceListPage>
  );
}
