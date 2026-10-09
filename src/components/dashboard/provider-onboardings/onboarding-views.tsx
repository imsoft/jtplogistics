"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useResourceCreate } from "@/hooks/use-resource-create";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { FormSkeleton } from "@/components/ui/skeletons";
import { OnboardingForm, emptyOnboardingForm, type OnboardingFormData } from "./onboarding-form";
import type { OnboardingRow } from "./onboardings-table";

const ENDPOINT = "/api/provider-onboardings";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Lo que viaja al servidor: fechas vacías en null y el detenido como fecha. */
function toPayload(f: OnboardingFormData) {
  const d = (v: string) => v || null;
  return {
    legalName: f.legalName,
    commercialName: f.commercialName,
    prospectId: f.prospectId,
    startedOn: f.startedOn,
    docs: f.docs,
    completedOn: d(f.completedOn),
    altaAuthorizedBy: f.altaAuthorizedBy,
    contractStatus: f.contractStatus,
    legalRequestedOn: d(f.legalRequestedOn),
    legalReceivedOn: d(f.legalReceivedOn),
    sentToProviderOn: d(f.sentToProviderOn),
    signedReceivedOn: d(f.signedReceivedOn),
    contractAuthorizedBy: f.contractAuthorizedBy,
    notes: f.notes,
    purchasingNotes: f.purchasingNotes,
    onHold: f.onHold,
    holdReason: f.holdReason,
  };
}

function toFormData(r: OnboardingRow): OnboardingFormData {
  return {
    legalName: r.legalName,
    commercialName: r.commercialName,
    prospectId: r.prospectId,
    startedOn: r.startedOn,
    docs: r.docs,
    completedOn: r.completedOn ?? "",
    altaAuthorizedBy: r.altaAuthorizedBy ?? "",
    contractStatus: r.contractStatus,
    legalRequestedOn: r.legalRequestedOn ?? "",
    legalReceivedOn: r.legalReceivedOn ?? "",
    sentToProviderOn: r.sentToProviderOn ?? "",
    signedReceivedOn: r.signedReceivedOn ?? "",
    contractAuthorizedBy: r.contractAuthorizedBy ?? "",
    notes: r.notes ?? "",
    purchasingNotes: r.purchasingNotes ?? "",
    onHold: r.onHoldSince !== null,
    holdReason: r.holdReason ?? "",
  };
}

/**
 * Alta nueva. Si viene `?prospectId=`, se llena con la razón social y el
 * nombre comercial del prospecto y queda ligada a él.
 */
export function NewOnboardingView({ basePath }: { basePath: string }) {
  const params = useSearchParams();
  const prospectId = params.get("prospectId");
  const { error, isSubmitting, handleSubmit } = useResourceCreate({ endpoint: ENDPOINT, redirectHref: basePath });
  const [initial, setInitial] = useState<OnboardingFormData | null>(prospectId ? null : emptyOnboardingForm(todayKey()));

  useEffect(() => {
    if (!prospectId) return;
    fetch(`/api/provider-prospects/${prospectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { commercialName: string; legalName: string | null } | null) => {
        const base = emptyOnboardingForm(todayKey());
        setInitial(
          p
            ? { ...base, prospectId, legalName: p.legalName ?? "", commercialName: p.commercialName }
            : base
        );
      })
      .catch(() => setInitial(emptyOnboardingForm(todayKey())));
  }, [prospectId]);

  return (
    <ResourceNewPage
      title="Nueva alta de proveedor"
      description="El expediente y el contrato de un transportista que se está dando de alta."
      backHref={basePath}
      backLabel="Volver a altas"
      error={error}
    >
      {initial ? (
        <OnboardingForm
          initialValues={initial}
          submitLabel="Guardar alta"
          cancelHref={basePath}
          onSubmit={(f) => handleSubmit(toPayload(f))}
          isSubmitting={isSubmitting}
        />
      ) : (
        <FormSkeleton />
      )}
    </ResourceNewPage>
  );
}

export function EditOnboardingView({ basePath, canDelete = false }: { basePath: string; canDelete?: boolean }) {
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } = useResourceEdit<OnboardingRow>({
    endpoint: ENDPOINT,
    redirectHref: basePath,
    deleteRedirectHref: basePath,
  });

  if (!isLoaded) return <FormSkeleton />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={data?.legalName ?? "Alta de proveedor"}
        description={data?.commercialName ?? "Editar el expediente y el contrato."}
        backHref={basePath}
        backLabel="Volver a altas"
        deleteTitle="¿Eliminar esta alta?"
        deleteDescription="Se borra el seguimiento del expediente y del contrato. No se puede deshacer."
        onDelete={handleDelete}
        showDelete={canDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
        {data && (
          <OnboardingForm
            initialValues={toFormData(data)}
            submitLabel="Guardar cambios"
            cancelHref={basePath}
            onSubmit={(f) => handleSubmit(toPayload(f))}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
