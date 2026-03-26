"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import type { Employee, EmployeeFormData } from "@/types/resources.types";

export default function CarrierCollaboratorEditPage() {
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } = useResourceEdit<Employee>({
    endpoint: "/api/collaborators",
    redirectHref: "/carrier/dashboard/collaborators",
    deleteRedirectHref: "/carrier/dashboard/collaborators",
  });

  function onSubmit(formData: EmployeeFormData) {
    handleSubmit(formData);
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={data?.name ?? "Colaborador"}
        description="Editar información del colaborador."
        backHref="/carrier/dashboard/collaborators"
        backLabel="Volver a colaboradores"
        deleteTitle="¿Eliminar colaborador?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <EmployeeForm
          initialValues={data}
          submitLabel="Guardar cambios"
          cancelHref="/carrier/dashboard/collaborators"
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {!data && isLoaded && <p className="text-sm text-destructive">No se encontró el colaborador.</p>}
    </div>
  );
}
