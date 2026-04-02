"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ShipmentForm } from "@/components/dashboard/resources/shipment-form";
import type { Shipment } from "@/types/shipment.types";

export default function EditShipmentPage() {
  const { id } = useParams<{ id: string }>();

  const { data: shipment, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Shipment>({
      endpoint: "/api/admin/shipments",
      redirectHref: `/admin/dashboard/shipments/${id}`,
      deleteRedirectHref: "/admin/dashboard/shipments",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  const title = shipment
    ? [shipment.eco, shipment.origin, shipment.destination].filter(Boolean).join(" – ") || "Embarque"
    : "Embarque";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={title}
        description="Editar información del embarque."
        backHref={`/admin/dashboard/shipments/${id}`}
        backLabel="Volver al detalle"
        deleteTitle="¿Eliminar embarque?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
        showDelete={shipment?.status !== "returned"}
      />

      <div className="w-full min-w-0">
        {shipment?.status === "returned" && (
          <p className="mb-4 text-sm text-muted-foreground">
            Este embarque está cerrado. Para poder guardar cambios, reabre el embarque cambiando
            el estado a una opción distinta de “Cerrado”.
          </p>
        )}
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {shipment && (
          <ShipmentForm
            initialValues={shipment}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/shipments/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
