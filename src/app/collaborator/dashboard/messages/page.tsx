import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { MessagesTable } from "@/components/dashboard/messages/messages-table";

export const metadata = {
  title: "Mensajes | JTP Logistics",
  description: "Gestionar mensajes",
};

export default function CollaboratorMessagesPage() {
  return (
    <ResourceListPage
      title="Mensajes"
      description="Mensajes internos y comunicación."
    >
      <MessagesTable
        apiEndpoint="/api/admin/messages"
        detailBasePath="/collaborator/dashboard/messages"
      />
    </ResourceListPage>
  );
}
