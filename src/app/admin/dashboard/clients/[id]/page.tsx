"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ClientForm } from "@/components/dashboard/resources/client-form";
import type { Client } from "@/types/client.types";

export default function EditClientPage() {
  const { data: client, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Client>({
      endpoint: "/api/admin/clients",
      redirectHref: "/admin/dashboard/clients",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={client?.name ?? "Cliente"}
        description="Editar información del cliente."
        backHref="/admin/dashboard/clients"
        backLabel="Volver a clientes"
        deleteTitle="¿Eliminar cliente?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {client && (
          <ClientForm
            initialValues={client}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/clients"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
