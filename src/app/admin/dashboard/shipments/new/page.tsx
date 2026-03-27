"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ShipmentForm } from "@/components/dashboard/resources/shipment-form";

export default function NewShipmentPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/shipments",
    redirectHref: "/admin/dashboard/shipments",
  });

  return (
    <ResourceNewPage
      title="Nuevo embarque"
      description="Completa los datos para registrar un embarque."
      backHref="/admin/dashboard/shipments"
      backLabel="Volver a embarques"
      error={error}
    >
      <ShipmentForm
        submitLabel="Crear embarque"
        cancelHref="/admin/dashboard/shipments"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
