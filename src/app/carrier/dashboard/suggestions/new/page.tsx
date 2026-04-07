"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { CarrierSuggestionForm } from "@/components/dashboard/carrier-suggestions/carrier-suggestion-form";
import type { CarrierSuggestionFormData } from "@/types/carrier-suggestion.types";

export default function NewCarrierSuggestionPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/carrier/suggestions",
    redirectHref: "/carrier/dashboard/suggestions",
  });

  function onSubmit(data: CarrierSuggestionFormData) {
    handleSubmit(data);
  }

  return (
    <ResourceNewPage
      title="Nueva sugerencia"
      description="Describe tu idea o mejora. El equipo la revisará y podrás ver el estado aquí."
      backHref="/carrier/dashboard/suggestions"
      backLabel="Volver a sugerencias"
      error={error}
    >
      <CarrierSuggestionForm
        submitLabel="Enviar sugerencia"
        cancelHref="/carrier/dashboard/suggestions"
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
