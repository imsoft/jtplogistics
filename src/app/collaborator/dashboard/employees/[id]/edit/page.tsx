"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import type { Employee } from "@/types/resources.types";

export default function CollaboratorEditEmployeePage() {
  const { id } = useParams<{ id: string }>();

  const { data: employee, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Employee>({
      endpoint: "/api/collaborator/employees",
      redirectHref: `/collaborator/dashboard/employees/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/employees",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={employee?.name ?? "Colaborador"}
        description="Editar información del colaborador."
        backHref={`/collaborator/dashboard/employees/${id}`}
        backLabel="Volver al perfil"
        deleteTitle="¿Eliminar colaborador?"
        deleteDescription="Esta acción no se puede deshacer. Se eliminará el colaborador y su acceso al sistema."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {employee && (
          <EmployeeForm
            initialValues={employee}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/employees/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
