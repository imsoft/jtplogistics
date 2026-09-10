"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/ui/skeletons";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import {
  EmployeeScheduleCard,
  saveSchedule,
  type Day,
} from "@/components/dashboard/time-clock/employee-schedule-card";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import type { Employee } from "@/types/resources.types";

export default function CollaboratorEditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useCollaboratorPermissions();

  // undefined mientras la tarjeta del horario carga: sin esto, mandar el
  // formulario antes de que termine borraría el horario que ya tenía.
  const [schedule, setSchedule] = useState<Day[] | "invalid" | undefined>(undefined);

  const { data: employee, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Employee>({
      endpoint: "/api/collaborator/employees",
      redirectHref: `/collaborator/dashboard/employees/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/employees",
    });

  async function onSubmit(formData: unknown) {
    if (schedule === "invalid") {
      toast.error("Revisa el horario: alguna hora quedó vacía.");
      return;
    }
    // El horario primero: guardarlo después sería tarde, porque el guardado de
    // la ficha redirige y se perdería el cambio sin que nadie se entere.
    if (Array.isArray(schedule) && !(await saveSchedule(id, schedule))) {
      toast.error("No se pudo guardar el horario. No se guardó nada.");
      return;
    }
    handleSubmit(formData);
  }

  if (!isLoaded) return <FormSkeleton />;

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
        showDelete={permissions?.canDeleteEmployees ?? false}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {employee && (
          <EmployeeForm
            initialValues={employee}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/employees/${id}`}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          >
            {permissions?.canManageSchedules && (
              <EmployeeScheduleCard userId={id} onChange={setSchedule} />
            )}
          </EmployeeForm>
        )}
      </div>
    </div>
  );
}
