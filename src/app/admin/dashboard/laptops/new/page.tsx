"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { LaptopForm } from "@/components/dashboard/resources/laptop-form";

export default function NewLaptopPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/laptops",
    redirectHref: "/admin/dashboard/laptops",
  });

  return (
    <ResourceNewPage
      title="Nueva laptop"
      description="Registra una nueva laptop en el inventario."
      backHref="/admin/dashboard/laptops"
      backLabel="Volver a laptops"
      error={error}
    >
      <LaptopForm
        submitLabel="Crear laptop"
        cancelHref="/admin/dashboard/laptops"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
