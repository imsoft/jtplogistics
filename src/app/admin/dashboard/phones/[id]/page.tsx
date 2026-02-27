"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { PhoneForm } from "@/components/dashboard/resources/phone-form";
import type { PhoneDevice } from "@/types/resources.types";

export default function EditPhonePage() {
  const { data: phone, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<PhoneDevice>({
      endpoint: "/api/admin/phones",
      redirectHref: "/admin/dashboard/phones",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={phone?.name ?? "Celular"}
        description="Editar información del celular."
        backHref="/admin/dashboard/phones"
        backLabel="Volver a celulares"
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
            cancelHref="/admin/dashboard/phones"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
