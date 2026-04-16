"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { VendorForm } from "@/components/dashboard/resources/vendor-form";
import type { Vendor } from "@/types/resources.types";

export default function EditCollaboratorVendorPage() {
  const { id } = useParams<{ id: string }>();

  const { data: vendor, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Vendor>({
      endpoint: "/api/collaborator/vendors",
      redirectHref: `/collaborator/dashboard/vendors/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/vendors",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={vendor?.name ?? "Vendedor"}
        description="Editar información del vendedor."
        backHref={`/collaborator/dashboard/vendors/${id}`}
        backLabel="Volver al perfil"
        deleteTitle="¿Eliminar vendedor?"
        deleteDescription="Esta acción no se puede deshacer. Se eliminará el vendedor y su acceso al sistema."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {vendor && (
          <VendorForm
            initialValues={vendor}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/vendors/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
