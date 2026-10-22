import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { LeadsTable } from "@/components/dashboard/client-leads/leads-table";

export const metadata = {
  title: "CRM de clientes | JTP Logistics",
  description: "Prospectos de cliente, su etapa y su seguimiento",
};

export default function ClientLeadsPage() {
  return (
    <ResourceListPage
      title="CRM de clientes"
      description="Las empresas a las que se les quiere vender, en qué etapa va cada una y qué toca hacer."
      newHref="/admin/dashboard/client-leads/new"
      newLabel="Nuevo prospecto"
    >
      <LeadsTable basePath="/admin/dashboard/client-leads" canEdit canDelete />
    </ResourceListPage>
  );
}
