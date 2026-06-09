"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ShipmentForm } from "@/components/dashboard/resources/shipment-form";

export default function NewCollaboratorShipmentPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/shipments",
    redirectHref: "/collaborator/dashboard/shipments",
  });

  return (
    <ResourceNewPage
      title="Nuevo embarque"
      description="Completa los datos para registrar un embarque."
      backHref="/collaborator/dashboard/shipments"
      backLabel="Volver a embarques"
      error={error}
    >
      <ShipmentForm
        scope="collaborator"
        submitLabel="Crear embarque"
        cancelHref="/collaborator/dashboard/shipments"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
