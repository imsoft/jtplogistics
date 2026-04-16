"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { PhoneForm } from "@/components/dashboard/resources/phone-form";
import type { PhoneDevice } from "@/types/resources.types";

export default function EditCollaboratorPhonePage() {
  const { id } = useParams<{ id: string }>();

  const { data: phone, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<PhoneDevice>({
      endpoint: "/api/collaborator/phones",
      redirectHref: `/collaborator/dashboard/phones/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/phones",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={phone?.name ?? "Celular"}
        description="Editar información del celular."
        backHref={`/collaborator/dashboard/phones/${id}`}
        backLabel="Volver al celular"
        deleteTitle="¿Eliminar celular?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {phone && (
          <PhoneForm
            initialValues={phone}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/phones/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
