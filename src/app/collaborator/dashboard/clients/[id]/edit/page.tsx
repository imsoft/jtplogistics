"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ClientForm } from "@/components/dashboard/resources/client-form";
import type { Client } from "@/types/client.types";

export default function EditCollaboratorClientPage() {
  const { id } = useParams<{ id: string }>();

  const { data: client, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Client>({
      endpoint: "/api/collaborator/clients",
      redirectHref: `/collaborator/dashboard/clients/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/clients",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={client?.name ?? "Cliente"}
        description="Editar información del cliente."
        backHref={`/collaborator/dashboard/clients/${id}`}
        backLabel="Volver al perfil"
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
            cancelHref={`/collaborator/dashboard/clients/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
