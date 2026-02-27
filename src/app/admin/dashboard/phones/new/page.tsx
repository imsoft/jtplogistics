"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { PhoneForm } from "@/components/dashboard/resources/phone-form";

export default function NewPhonePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/phones",
    redirectHref: "/admin/dashboard/phones",
  });

  return (
    <ResourceNewPage
      title="Nuevo celular"
      description="Registra un nuevo celular en el inventario."
      backHref="/admin/dashboard/phones"
      backLabel="Volver a celulares"
      error={error}
    >
      <PhoneForm
        submitLabel="Crear celular"
        cancelHref="/admin/dashboard/phones"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
