"use client";

import { useParams } from "next/navigation";
import { FormSkeleton } from "@/components/ui/skeletons";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { LaptopForm } from "@/components/dashboard/resources/laptop-form";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import type { Laptop } from "@/types/resources.types";

export default function EditCollaboratorLaptopPage() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useCollaboratorPermissions();

  const { data: laptop, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Laptop>({
      endpoint: "/api/collaborator/laptops",
      redirectHref: `/collaborator/dashboard/laptops/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/laptops",
    });

  if (!isLoaded) return <FormSkeleton />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={laptop?.name ?? "Laptop"}
        description="Editar información de la laptop."
        backHref={`/collaborator/dashboard/laptops/${id}`}
        backLabel="Volver a la laptop"
        deleteTitle="¿Eliminar laptop?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
        showDelete={Boolean(permissions?.canDeleteLaptops)}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {laptop && (
          <LaptopForm
            scope="collaborator"
            initialValues={laptop}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/laptops/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
