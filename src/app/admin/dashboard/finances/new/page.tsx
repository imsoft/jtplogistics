"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { FinanceForm } from "@/components/dashboard/resources/finance-form";

export default function NewFinancePage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/finances",
    redirectHref: "/admin/dashboard/finances",
  });

  return (
    <ResourceNewPage
      title="Nuevo registro de finanzas"
      description="Completa los datos para registrar un movimiento."
      backHref="/admin/dashboard/finances"
      backLabel="Volver a finanzas"
      error={error}
    >
      <FinanceForm
        submitLabel="Crear registro"
        cancelHref="/admin/dashboard/finances"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
