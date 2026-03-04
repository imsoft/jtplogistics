"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { VendorForm } from "@/components/dashboard/resources/vendor-form";

export default function NewVendorPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/vendors",
    redirectHref: "/admin/dashboard/vendors",
  });

  return (
    <ResourceNewPage
      title="Nuevo vendedor"
      description="Completa los datos para registrar un vendedor."
      backHref="/admin/dashboard/vendors"
      backLabel="Volver a vendedores"
      error={error}
    >
      <VendorForm
        submitLabel="Crear vendedor"
        cancelHref="/admin/dashboard/vendors"
        isNew
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
