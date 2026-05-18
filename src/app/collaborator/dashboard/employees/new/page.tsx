"use client";

import { useEffect, useRef } from "react";
import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";

export default function CollaboratorNewEmployeePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/employees",
    redirectHref: "/collaborator/dashboard/employees",
  });

  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  return (
    <ResourceNewPage
      title="Nuevo colaborador"
      description="Completa los datos para registrar un colaborador."
      backHref="/collaborator/dashboard/employees"
      backLabel="Volver a colaboradores"
      error={error}
      errorRef={errorRef}
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
