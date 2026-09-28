import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ProspectsTable } from "@/components/dashboard/prospects/prospects-table";

export const metadata = {
  title: "Prospección de proveedores | JTP Logistics",
  description: "Transportistas en prospección y su etapa",
};

export default function ProspectsPage() {
  return (
    <ResourceListPage
      title="Prospección de proveedores"
      description="Transportistas que se están prospectando y en qué etapa va cada uno."
      newHref="/admin/dashboard/prospects/new"
      newLabel="Nuevo prospecto"
    >
      <ProspectsTable editBase="/admin/dashboard/prospects" canEdit canDelete />
    </ResourceListPage>
  );
}
