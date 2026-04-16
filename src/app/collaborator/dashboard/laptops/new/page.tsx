"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { LaptopForm } from "@/components/dashboard/resources/laptop-form";

export default function NewCollaboratorLaptopPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/laptops",
    redirectHref: "/collaborator/dashboard/laptops",
  });

  return (
    <ResourceNewPage
      title="Nueva laptop"
      description="Registra una nueva laptop en el inventario."
      backHref="/collaborator/dashboard/laptops"
      backLabel="Volver a laptops"
      error={error}
    >
      <LaptopForm
        submitLabel="Crear laptop"
        cancelHref="/collaborator/dashboard/laptops"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
