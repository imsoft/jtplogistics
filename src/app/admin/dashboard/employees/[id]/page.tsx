"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import type { Employee } from "@/types/resources.types";

export default function EditEmployeePage() {
  const { data: employee, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Employee>({
      endpoint: "/api/admin/employees",
      redirectHref: "/admin/dashboard/employees",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={employee?.name ?? "Colaborador"}
        description="Editar información del colaborador."
        backHref="/admin/dashboard/employees"
        backLabel="Volver a colaboradores"
        deleteTitle="¿Eliminar colaborador?"
        deleteDescription="Esta acción no se puede deshacer. Se eliminará el colaborador y su acceso al sistema."
        onDelete={handleDelete}
      />
      {employee && (
        <div className="flex items-center gap-4">
          <AvatarUpload
            currentImage={employee.image}
            name={employee.name}
            endpoint={`/api/admin/employees/${employee.id}/avatar`}
            onSuccess={(url) => setData((prev) => prev ? { ...prev, image: url } : prev)}
            size={72}
          />
          <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
        </div>
      )}
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {employee && (
          <EmployeeForm
            initialValues={employee}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/employees"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
