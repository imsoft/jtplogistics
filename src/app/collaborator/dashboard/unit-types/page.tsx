import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

export const metadata = {
  title: "Tipos de Unidades | JTP Logistics",
  description: "Ver tipos de unidades",
};

export default function CollaboratorUnitTypesPage() {
  return (
    <ResourceListPage
      title="Tipos de unidades"
      description="Tipos de unidades disponibles en el sistema."
    >
      <p className="text-muted-foreground">Información de solo lectura de tipos de unidades.</p>
    </ResourceListPage>
  );
}
