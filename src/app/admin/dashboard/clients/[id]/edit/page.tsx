"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Route as RouteIcon } from "lucide-react";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ClientForm } from "@/components/dashboard/resources/client-form";
import { ClientRoutesDialog } from "@/components/dashboard/clients/client-routes-dialog";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/client.types";

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const [routesOpen, setRoutesOpen] = useState(false);

  const { data: client, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Client>({
      endpoint: "/api/admin/clients",
      redirectHref: `/admin/dashboard/clients/${id}`,
      deleteRedirectHref: "/admin/dashboard/clients",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={client?.name ?? "Cliente"}
        description="Editar información del cliente."
        backHref={`/admin/dashboard/clients/${id}`}
        backLabel="Volver al perfil"
        deleteTitle="¿Eliminar cliente?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      >
        <Button variant="outline" onClick={() => setRoutesOpen(true)}>
          <RouteIcon className="size-4" />
          Seleccionar rutas
        </Button>
      </ResourceEditHeader>

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {client && (
          <ClientForm
            initialValues={client}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/clients/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {id && (
        <ClientRoutesDialog
          clientId={id}
          open={routesOpen}
          onOpenChange={setRoutesOpen}
        />
      )}
    </div>
  );
}
