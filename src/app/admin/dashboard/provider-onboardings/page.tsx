import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { OnboardingsTable } from "@/components/dashboard/provider-onboardings/onboardings-table";

export const metadata = {
  title: "Alta de proveedores | JTP Logistics",
  description: "Expediente y contrato de cada transportista en proceso de alta",
};

export default function ProviderOnboardingsPage() {
  return (
    <ResourceListPage
      title="Alta de proveedores"
      description="El expediente y el contrato de cada transportista que se está dando de alta."
      newHref="/admin/dashboard/provider-onboardings/new"
      newLabel="Nueva alta"
    >
      <OnboardingsTable editBase="/admin/dashboard/provider-onboardings" canEdit canDelete />
    </ResourceListPage>
  );
}
