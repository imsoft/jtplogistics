"use client";

import { useParams } from "next/navigation";
import { useResourceCreate } from "@/hooks/use-resource-create";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { FormSkeleton } from "@/components/ui/skeletons";
import { formatMxn } from "@/lib/utils";
import { LeadForm, type LeadFormData } from "./lead-form";
import type { Lead } from "./lead-types";

const ENDPOINT = "/api/client-leads";

function toFormData(l: Lead): LeadFormData {
  return {
    companyName: l.companyName,
    contactName: l.contactName ?? "",
    position: l.position ?? "",
    phone: l.phone ?? "",
    email: l.email ?? "",
    city: l.city ?? "",
    industry: l.industry ?? "",
    source: l.source ?? "",
    stage: l.stage,
    estimatedMonthly: l.estimatedMonthly != null ? formatMxn(l.estimatedMonthly) : "",
    ownerId: l.ownerId ?? "",
    nextAction: l.nextAction ?? "",
    nextFollowUpOn: l.nextFollowUpOn ?? "",
    notes: l.notes ?? "",
    lostReason: l.lostReason ?? "",
  };
}

export function NewLeadView({ basePath }: { basePath: string }) {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({ endpoint: ENDPOINT, redirectHref: basePath });

  return (
    <ResourceNewPage
      title="Nuevo prospecto de cliente"
      description="Una empresa a la que se le quiere vender."
      backHref={basePath}
      backLabel="Volver al CRM"
      error={error}
    >
      <LeadForm submitLabel="Guardar prospecto" cancelHref={basePath} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </ResourceNewPage>
  );
}

export function EditLeadView({ basePath, canDelete = false }: { basePath: string; canDelete?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } = useResourceEdit<Lead>({
    endpoint: ENDPOINT,
    redirectHref: `${basePath}/${id}`,
    deleteRedirectHref: basePath,
  });

  if (!isLoaded) return <FormSkeleton />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={data?.companyName ?? "Prospecto"}
        description="Editar el prospecto de cliente."
        backHref={`${basePath}/${id}`}
        backLabel="Volver a la ficha"
        deleteTitle="¿Eliminar este prospecto?"
        deleteDescription="Se borra con todas sus actividades. Si no se cerró, mejor márcalo como perdido con su motivo."
        onDelete={handleDelete}
        showDelete={canDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
        {data && (
          <LeadForm
            initialValues={toFormData(data)}
            submitLabel="Guardar cambios"
            cancelHref={`${basePath}/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
