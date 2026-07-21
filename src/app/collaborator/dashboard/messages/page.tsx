import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

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
      <p className="text-muted-foreground">Sección de mensajes.</p>
    </ResourceListPage>
  );
}
