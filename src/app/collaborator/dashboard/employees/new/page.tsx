"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";

export default function CollaboratorNewEmployeePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/employees",
    redirectHref: "/collaborator/dashboard/employees",
  });

  return (
    <ResourceNewPage
      title="Nuevo colaborador"
      description="Completa los datos para registrar un colaborador."
      backHref="/collaborator/dashboard/employees"
      backLabel="Volver a colaboradores"
      error={error}
    >
      <EmployeeForm
        submitLabel="Crear colaborador"
        cancelHref="/collaborator/dashboard/employees"
        isNew
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
