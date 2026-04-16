"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ClientForm } from "@/components/dashboard/resources/client-form";

export default function NewCollaboratorClientPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/clients",
    redirectHref: "/collaborator/dashboard/clients",
  });

  return (
    <ResourceNewPage
      title="Nuevo cliente"
      description="Completa los datos para registrar un cliente."
      backHref="/collaborator/dashboard/clients"
      backLabel="Volver a clientes"
      error={error}
    >
      <ClientForm
        submitLabel="Crear cliente"
        cancelHref="/collaborator/dashboard/clients"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
