import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmailsTable } from "@/components/dashboard/resources/emails-table";

export const metadata = {
  title: "Correos | JTP Logistics",
  description: "Gestionar cuentas de correo de la empresa",
};

export default function EmailsPage() {
  return (
    <ResourceListPage
      title="Correos"
      description="Cuentas de correo registradas y sus accesos."
      newHref="/admin/dashboard/emails/new"
      newLabel="Nueva cuenta"
    >
      <EmailsTable />
    </ResourceListPage>
  );
}
