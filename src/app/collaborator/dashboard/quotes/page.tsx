import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

export const metadata = {
  title: "Cotizador | JTP Logistics",
  description: "Gestionar cotizaciones",
};

export default function CollaboratorQuotesPage() {
  return (
    <ResourceListPage
      title="Cotizador"
      description="Cotizaciones registradas en el sistema."
      newHref="/collaborator/dashboard/quotes/new"
      newLabel="Nueva cotización"
    >
      <p className="text-muted-foreground">Sección de cotizador.</p>
    </ResourceListPage>
  );
}
