"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";

export default function NewCarrierCollaboratorPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborators",
    redirectHref: "/carrier/dashboard/collaborators",
  });

  return (
    <ResourceNewPage
      title="Nuevo colaborador"
      description="Completa los datos para registrar un colaborador."
      backHref="/carrier/dashboard/collaborators"
      backLabel="Volver a colaboradores"
      error={error}
    >
      <EmployeeForm
        submitLabel="Crear colaborador"
        cancelHref="/carrier/dashboard/collaborators"
        isNew
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
