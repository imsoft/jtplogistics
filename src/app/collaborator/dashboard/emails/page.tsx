import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmailsTable } from "@/components/dashboard/resources/emails-table";

export const metadata = {
  title: "Correos | JTP Logistics",
  description: "Gestionar cuentas de correo",
};

export default function CollaboratorEmailsPage() {
  return (
    <ResourceListPage
      title="Correos"
      description="Cuentas de correo registradas y sus accesos."
      newHref="/collaborator/dashboard/emails/new"
      newLabel="Nueva cuenta"
    >
      <EmailsTable
        apiEndpoint="/api/collaborator/emails"
        detailBasePath="/collaborator/dashboard/emails"
      />
    </ResourceListPage>
  );
}
