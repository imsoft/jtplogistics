"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { LaptopForm } from "@/components/dashboard/resources/laptop-form";
import type { Laptop } from "@/types/resources.types";

export default function EditLaptopPage() {
  const { data: laptop, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Laptop>({
      endpoint: "/api/admin/laptops",
      redirectHref: "/admin/dashboard/laptops",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={laptop?.name ?? "Laptop"}
        description="Editar información de la laptop."
        backHref="/admin/dashboard/laptops"
        backLabel="Volver a laptops"
        deleteTitle="¿Eliminar laptop?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {laptop && (
          <LaptopForm
            initialValues={laptop}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/laptops"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
