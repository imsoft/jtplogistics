"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { VendorForm } from "@/components/dashboard/resources/vendor-form";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import type { Vendor } from "@/types/resources.types";

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();

  const { data: vendor, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Vendor>({
      endpoint: "/api/admin/vendors",
      redirectHref: `/admin/dashboard/vendors/${id}`,
      deleteRedirectHref: "/admin/dashboard/vendors",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={vendor?.name ?? "Vendedor"}
        description="Editar información del vendedor."
        backHref={`/admin/dashboard/vendors/${id}`}
        backLabel="Volver al perfil"
        deleteTitle="¿Eliminar vendedor?"
        deleteDescription="Esta acción no se puede deshacer. Se eliminará el vendedor y su acceso al sistema."
        onDelete={handleDelete}
      />
      {vendor && (
        <div className="flex items-center gap-4">
          <AvatarUpload
            currentImage={vendor.image}
            name={vendor.name}
            endpoint={`/api/admin/vendors/${vendor.id}/avatar`}
            onSuccess={(url) => setData((prev) => prev ? { ...prev, image: url } : prev)}
            size={72}
          />
          <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
        </div>
      )}
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {vendor && (
          <VendorForm
            initialValues={vendor}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/vendors/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
