"use client";

import { FormSkeleton } from "@/components/ui/skeletons";
import { useParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { LOCK_TEXT, shipmentLockReason } from "@/lib/shipment-lock";
import { ShipmentForm } from "@/components/dashboard/resources/shipment-form";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import type { Shipment } from "@/types/shipment.types";

export default function EditCollaboratorShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useCollaboratorPermissions();

  const { data: shipment, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Shipment>({
      endpoint: "/api/collaborator/shipments",
      redirectHref: `/collaborator/dashboard/shipments/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/shipments",
    });

  if (!isLoaded) return <FormSkeleton />;

  const title = shipment
    ? [shipment.eco, shipment.origin, shipment.destination].filter(Boolean).join(" – ") || "Embarque"
    : "Embarque";

  const lock = shipment ? shipmentLockReason(shipment) : null;
  const isClosed = lock !== null;
  const lockText = lock ? LOCK_TEXT[lock] : null;
  const canDelete = Boolean(permissions?.canDeleteShipments) && shipment?.status !== "returned";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={title}
        description="Editar información del embarque."
        backHref={`/collaborator/dashboard/shipments/${id}`}
        backLabel="Volver al detalle"
        deleteTitle="¿Eliminar embarque?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
        showDelete={canDelete}
      />

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {isClosed && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="size-4 shrink-0 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">
                {lockText?.title}
              </p>
            </div>
            {/* El colaborador no desbloquea: solo dirección (admin) o soporte de TI. */}
            <p className="text-sm text-amber-700">
              Solo dirección puede desbloquearlo.
              {permissions?.canViewFinances ? " Las tarifas sí se pueden capturar abajo." : ""}
            </p>
          </div>
        )}

        {shipment && (
          <ShipmentForm
            scope="collaborator"
            initialValues={shipment}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/shipments/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            showTariffs={permissions?.canViewFinances ?? false}
          />
        )}
      </div>
    </div>
  );
}
