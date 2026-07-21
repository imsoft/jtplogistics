import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

export const metadata = {
  title: "Cotización Marítima | JTP Logistics",
  description: "Gestionar cotizaciones marítimas",
};

export default function CollaboratorMaritimeQuotesPage() {
  return (
    <ResourceListPage
      title="Cotización marítima"
      description="Cotizaciones marítimas registradas."
      newHref="/collaborator/dashboard/maritime-quotes/new"
      newLabel="Nueva cotización"
    >
      <p className="text-muted-foreground">Sección de cotizaciones marítimas.</p>
    </ResourceListPage>
  );
}
