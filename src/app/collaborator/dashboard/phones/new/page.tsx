"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { PhoneForm } from "@/components/dashboard/resources/phone-form";

export default function NewCollaboratorPhonePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/phones",
    redirectHref: "/collaborator/dashboard/phones",
  });

  return (
    <ResourceNewPage
      title="Nuevo celular"
      description="Registra un nuevo celular en el inventario."
      backHref="/collaborator/dashboard/phones"
      backLabel="Volver a celulares"
      error={error}
    >
      <PhoneForm
        scope="collaborator"
        submitLabel="Crear celular"
        cancelHref="/collaborator/dashboard/phones"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
