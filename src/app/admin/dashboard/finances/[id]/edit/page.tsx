"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { FinanceForm } from "@/components/dashboard/resources/finance-form";
import type { Finance } from "@/types/finance.types";

export default function EditFinancePage() {
  const { id } = useParams<{ id: string }>();

  const { data: finance, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Finance>({
      endpoint: "/api/admin/finances",
      redirectHref: `/admin/dashboard/finances/${id}`,
      deleteRedirectHref: "/admin/dashboard/finances",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  const title = finance
    ? [finance.eco, finance.origin, finance.destination].filter(Boolean).join(" – ") || "Registro de finanzas"
    : "Registro de finanzas";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={title}
        description="Editar información del registro de finanzas."
        backHref={`/admin/dashboard/finances/${id}`}
        backLabel="Volver al detalle"
        deleteTitle="¿Eliminar registro?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {finance && (
          <FinanceForm
            initialValues={finance}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/finances/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
