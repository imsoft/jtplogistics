"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { Button } from "@/components/ui/button";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";
import { normalizePayloadToLowercase } from "@/lib/text-case";
import { providerProfileHref } from "@/lib/provider-onboarding-account";
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
    email: f.email,
    rfc: f.rfc,
    startedOn: f.startedOn,
    docs: f.docs,
    completedOn: d(f.completedOn),
    altaAuthorizedBy: f.altaAuthorizedBy,
    contractStatus: f.contractStatus,
    urgency: f.urgency,
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
    email: r.email ?? "",
    rfc: r.rfc ?? "",
    startedOn: r.startedOn,
    docs: r.docs,
    completedOn: r.completedOn ?? "",
    altaAuthorizedBy: r.altaAuthorizedBy ?? "",
    contractStatus: r.contractStatus,
    urgency: r.urgency,
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

type AccountNotice = { status: string; message: string } | null | undefined;

/** Si al guardar se creó, ligó o no se pudo crear la cuenta del proveedor, se avisa. */
function toastAccount(account: AccountNotice) {
  if (!account) return;
  if (account.status === "skipped") toast.warning(account.message, { duration: 10000 });
  else toast.success(account.message, { duration: 8000 });
}

/**
 * Guarda el alta (POST o PATCH) igual que los hooks de recursos, pero leyendo
 * la respuesta: puede traer el aviso de la cuenta del proveedor.
 */
function useSaveOnboarding(redirectHref: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save(url: string, method: "POST" | "PATCH", payload: unknown) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizePayloadToLowercase(payload)),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; account?: AccountNotice };
      if (!res.ok) {
        setError(body.error ?? "No se pudo guardar");
        return;
      }
      toastAccount(body.account);
      router.push(redirectHref);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, save };
}

/**
 * Alta nueva. Si viene `?prospectId=`, se llena con la razón social y el
 * nombre comercial del prospecto y queda ligada a él.
 */
export function NewOnboardingView({ basePath }: { basePath: string }) {
  const params = useSearchParams();
  const prospectId = params.get("prospectId");
  const { error, isSubmitting, save } = useSaveOnboarding(basePath);
  const [initial, setInitial] = useState<OnboardingFormData | null>(prospectId ? null : emptyOnboardingForm(todayKey()));

  useEffect(() => {
    if (!prospectId) return;
    fetch(`/api/provider-prospects/${prospectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { commercialName: string; legalName: string | null; email: string | null } | null) => {
        const base = emptyOnboardingForm(todayKey());
        setInitial(
          p
            ? { ...base, prospectId, legalName: p.legalName ?? "", commercialName: p.commercialName, email: p.email ?? "" }
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
          onSubmit={(f) => save(ENDPOINT, "POST", toPayload(f))}
          isSubmitting={isSubmitting}
        />
      ) : (
        <FormSkeleton />
      )}
    </ResourceNewPage>
  );
}

export function EditOnboardingView({ basePath, canDelete = false }: { basePath: string; canDelete?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { data, isLoaded, error: loadError, handleDelete } = useResourceEdit<OnboardingRow>({
    endpoint: ENDPOINT,
    redirectHref: basePath,
    deleteRedirectHref: basePath,
  });
  const { error: saveError, isSubmitting, save } = useSaveOnboarding(basePath);
  const confirm = useConfirm();
  const error = saveError ?? loadError;
  const panel = basePath.startsWith("/admin") ? "admin" : "collaborator";

  async function handleSubmit(f: OnboardingFormData) {
    // Editar un registro existente siempre se confirma.
    if (!(await confirm(SAVE_CHANGES))) return;
    await save(`${ENDPOINT}/${id}`, "PATCH", toPayload(f));
  }

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
        {data?.userId && (
          <div className="bg-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 sm:px-5">
            <p className="text-sm">El proveedor ya tiene cuenta en la plataforma.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href={providerProfileHref(panel, data.userId)}>
                <UserRound className="size-4" />
                Ver perfil del proveedor
              </Link>
            </Button>
          </div>
        )}
        {data && (
          <OnboardingForm
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
