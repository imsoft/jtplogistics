"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { FormSkeleton } from "@/components/ui/skeletons";
import { ProspectForm, type ProspectFormData } from "./prospect-form";

const ENDPOINT = "/api/provider-prospects";

interface Prospect {
  id: string;
  commercialName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  coverage: string | null;
  status: string;
  legalName: string | null;
  city: string | null;
  contactedOn: string | null;
  notes: string | null;
  discardReason: string | null;
}

function toFormData(p: Prospect): ProspectFormData {
  return {
    commercialName: p.commercialName,
    contactName: p.contactName ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
    source: p.source ?? "",
    coverage: p.coverage ?? "",
    status: p.status,
    legalName: p.legalName ?? "",
    city: p.city ?? "",
    contactedOn: p.contactedOn ?? "",
    notes: p.notes ?? "",
    discardReason: p.discardReason ?? "",
  };
}

export function NewProspectView({ basePath }: { basePath: string }) {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: ENDPOINT,
    redirectHref: basePath,
  });

  return (
    <ResourceNewPage
      title="Nuevo prospecto"
      description="Registra un transportista que se está prospectando."
      backHref={basePath}
      backLabel="Volver a prospección"
      error={error}
    >
      <ProspectForm
        submitLabel="Guardar prospecto"
        cancelHref={basePath}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}

export function EditProspectView({
  basePath,
  canDelete = false,
}: {
  basePath: string;
  canDelete?: boolean;
}) {
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Prospect>({
      endpoint: ENDPOINT,
      redirectHref: basePath,
      deleteRedirectHref: basePath,
    });

  if (!isLoaded) return <FormSkeleton />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={data?.commercialName ?? "Prospecto"}
        description="Editar la ficha del prospecto."
        backHref={basePath}
        backLabel="Volver a prospección"
        deleteTitle="¿Eliminar prospecto?"
        deleteDescription="Se borra de la lista y no se puede deshacer. Si solo no sirvió, mejor descártalo con su motivo."
        onDelete={handleDelete}
        showDelete={canDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
        {data && (
          <ProspectForm
            initialValues={toFormData(data)}
            submitLabel="Guardar cambios"
            cancelHref={basePath}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
