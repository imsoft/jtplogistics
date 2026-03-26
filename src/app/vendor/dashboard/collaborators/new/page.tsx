"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";

export default function NewVendorCollaboratorPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborators",
    redirectHref: "/vendor/dashboard/collaborators",
  });

  return (
    <ResourceNewPage
      title="Nuevo colaborador"
      description="Completa los datos para registrar un colaborador."
      backHref="/vendor/dashboard/collaborators"
      backLabel="Volver a colaboradores"
      error={error}
    >
      <EmployeeForm
        submitLabel="Crear colaborador"
        cancelHref="/vendor/dashboard/collaborators"
        isNew
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
