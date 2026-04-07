"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { CarrierSuggestionForm } from "@/components/dashboard/carrier-suggestions/carrier-suggestion-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CARRIER_SUGGESTION_STATUS_COLORS,
  CARRIER_SUGGESTION_STATUS_LABELS,
} from "@/lib/constants/carrier-suggestion-status";
import type { CarrierSuggestion, CarrierSuggestionFormData } from "@/types/carrier-suggestion.types";

function isLoadedSuggestion(
  data: unknown
): data is CarrierSuggestion {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof (data as CarrierSuggestion).id === "string"
  );
}

export default function EditCarrierSuggestionPage() {
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<CarrierSuggestion>({
      endpoint: "/api/carrier/suggestions",
      redirectHref: "/carrier/dashboard/suggestions",
      deleteRedirectHref: "/carrier/dashboard/suggestions",
    });

  function onSubmit(formData: CarrierSuggestionFormData) {
    handleSubmit(formData);
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  const suggestion = isLoadedSuggestion(data) ? data : null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={suggestion?.title ?? "Sugerencia"}
        description="Editar o eliminar tu sugerencia."
        backHref="/carrier/dashboard/suggestions"
        backLabel="Volver a sugerencias"
        deleteTitle="¿Eliminar sugerencia?"
        deleteDescription="Solo se pueden eliminar sugerencias pendientes de revisión."
        onDelete={handleDelete}
        showDelete={suggestion?.status === "pending"}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {suggestion && suggestion.status !== "pending" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado</CardTitle>
            <CardDescription>
              Esta sugerencia ya no puede editarse ni eliminarse desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                CARRIER_SUGGESTION_STATUS_COLORS[suggestion.status] ??
                "bg-secondary text-secondary-foreground"
              }`}
            >
              {CARRIER_SUGGESTION_STATUS_LABELS[suggestion.status] ??
                suggestion.status}
            </span>
            {suggestion.description ? (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {suggestion.description}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {suggestion?.status === "pending" && (
        <CarrierSuggestionForm
          initialValues={suggestion}
          submitLabel="Guardar cambios"
          cancelHref="/carrier/dashboard/suggestions"
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {!suggestion && (
        <p className="text-destructive text-sm">No se encontró la sugerencia.</p>
      )}
    </div>
  );
}
