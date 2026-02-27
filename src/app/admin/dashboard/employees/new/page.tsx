"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";

export default function NewEmployeePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/employees",
    redirectHref: "/admin/dashboard/employees",
  });

  return (
    <ResourceNewPage
      title="Nuevo empleado"
      description="Completa los datos para registrar un colaborador."
      backHref="/admin/dashboard/employees"
      backLabel="Volver a empleados"
      error={error}
    >
      <EmployeeForm
        submitLabel="Crear empleado"
        cancelHref="/admin/dashboard/employees"
        isNew
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
