"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ContactPersonsCards } from "@/components/dashboard/users/contact-persons-cards";
import { CarrierRoutesManager } from "@/components/dashboard/users/carrier-routes-manager";
import { ProviderTariffButton } from "@/components/dashboard/providers/provider-tariff-button";
import { ToggleCarrierPermissions } from "@/components/dashboard/users/toggle-carrier-permissions";
import { CarrierRouteUnlockRequests } from "@/components/dashboard/users/carrier-route-unlock-requests";
import { DeleteUserButton } from "@/components/dashboard/users/delete-user-button";
import { groupContactsByPerson } from "@/lib/contacts";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { UserRole } from "@/types/user.types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface ProviderContact {
  id: string;
  type: "phone" | "email";
  value: string;
  label: string | null;
  personName: string | null;
  position: string | null;
}

interface CarrierRouteItem {
  id: string;
  unitType: string;
  carrierTarget: number | null;
  /** Condición pactada para esta ruta; sale en la quinta columna del tarifario. */
  terms: string | null;
  editUnlockRequested: boolean;
  editUnlockApproved: boolean;
  route: {
    origin: string;
    destination: string;
    description: string | null;
    target: number | null;
  };
}

interface ProviderData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  carrierNotes: string | null;
  canEditRoutes: boolean;
  canEditTarget: boolean;
  canAddRoutes: boolean;
  carrierRoutes: CarrierRouteItem[];
  profile: {
    commercialName: string | null;
    legalName: string | null;
    rfc: string | null;
    address: string | null;
    contacts: ProviderContact[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isLoaded: permissionsLoaded } = useCollaboratorPermissions();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitTypes, setUnitTypes] = useState<{ value: string; label: string }[]>([]);
  const hasRedirected = useRef(false);

  const from = searchParams.get("from");
  const backHref = from ? decodeURIComponent(from) : "/collaborator/dashboard/providers";

  useEffect(() => {
    if (permissionsLoaded && !permissions?.canViewProviders && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [permissionsLoaded, permissions, router]);

  useEffect(() => {
    if (!permissionsLoaded || !permissions?.canViewProviders || !id) return;
    fetch(`/api/collaborator/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || data.role !== "carrier") {
          setError(data.error ?? "Proveedor no encontrado");
        } else {
          setProvider(data);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setError("Error al cargar");
        setIsLoaded(true);
      });

    fetch("/api/unit-types")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUnitTypes)
      .catch(() => setUnitTypes([]));
  }, [permissionsLoaded, permissions, id]);

  if (!permissionsLoaded || !isLoaded) {
    return (
      <ResourceDetailSkeleton rows={6} />
    );
  }

  if (!permissions?.canViewProviders || error || !provider) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-destructive text-sm">{error ?? "No autorizado"}</p>
      </div>
    );
  }

  const contacts = provider.profile?.contacts ?? [];
  const contactPersons = groupContactsByPerson(contacts);
  // Quien firma el tarifario por parte del proveedor: su primer contacto con
  // nombre. Si no hay ninguno, se deja el nombre del proveedor.
  const tariffPerson = contactPersons.find((p) => p.name);
  const tariffContact = tariffPerson?.name || provider.name;
  // Correo y teléfono de esa misma persona; si no los tiene, los primeros del
  // proveedor. El correo de la cuenta queda como último recurso.
  const tariffEmail =
    tariffPerson?.contacts.find((c) => c.type === "email")?.value ??
    contacts.find((c) => c.type === "email")?.value ??
    provider.email;
  const tariffPhone =
    tariffPerson?.contacts.find((c) => c.type === "phone")?.value ??
    contacts.find((c) => c.type === "phone")?.value ??
    null;
  const canManage = !!permissions?.canUpdateProviders;
  const canDelete = !!permissions?.canDeleteProviders;
  const pendingUnlockRequests = provider.carrierRoutes
    .filter((cr) => cr.editUnlockRequested && !cr.editUnlockApproved)
    .map((cr) => ({
      id: cr.id,
      origin: cr.route.origin,
      destination: cr.route.destination,
      unitType: cr.unitType,
    }));

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={backHref} aria-label="Volver">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials(provider.name)}
            </div>
            <div className="min-w-0">
              <h1 className="page-heading truncate">
                {provider.profile?.commercialName ?? provider.name}
              </h1>
              {provider.profile?.commercialName && (
                <p className="truncate text-sm font-medium text-foreground/70">
                  {provider.name}
                </p>
              )}
              <p className="text-muted-foreground truncate text-xs sm:text-sm text-email">
                {provider.email}
              </p>
            </div>
          </div>
        </div>
        {canDelete ? (
          <DeleteUserButton
            userId={provider.id}
            userName={provider.profile?.commercialName ?? provider.name}
            redirectTo={backHref}
          />
        ) : !canManage ? (
          <Badge variant="outline" className="shrink-0">
            <Lock className="size-3 mr-1" />
            Solo lectura
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cuenta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Rol" value={USER_ROLE_LABELS[provider.role as UserRole]} />
            <InfoRow
              label="Registro"
              value={new Date(provider.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
            <InfoRow
              label="Última actualización"
              value={new Date(provider.updatedAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {/* Perfil */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {provider.profile ? (
              <>
                <InfoRow label="Nombre comercial" value={provider.profile.commercialName} />
                <InfoRow label="Razón social"     value={provider.profile.legalName} />
                <InfoRow label="RFC"              value={provider.profile.rfc} />
                <InfoRow label="Dirección"        value={provider.profile.address} />
              </>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                Este proveedor no tiene perfil registrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contactos agrupados por persona */}
      {provider.profile && <ContactPersonsCards persons={contactPersons} />}

      {/* Notas del transportista */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notas del transportista
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
            {provider.carrierNotes ?? "- Estadías\n- Reparto"}
          </pre>
        </CardContent>
      </Card>

      {/* Rutas seleccionadas */}
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rutas seleccionadas ({provider.carrierRoutes.length})
          </CardTitle>
          {provider.carrierRoutes.length > 0 && (
            <ProviderTariffButton
              legalName={provider.profile?.legalName || provider.name}
              contact={tariffContact}
              email={tariffEmail}
              phone={tariffPhone}
              routes={provider.carrierRoutes}
              unitTypes={unitTypes}
            />
          )}
        </CardHeader>
        {canManage && (
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <CarrierRouteUnlockRequests
              carrierId={provider.id}
              initialRequests={pendingUnlockRequests}
            />
            <ToggleCarrierPermissions
              userId={provider.id}
              initialCanEditRoutes={provider.canEditRoutes}
              initialCanEditTarget={provider.canEditTarget}
              initialCanAddRoutes={provider.canAddRoutes}
            />
          </CardContent>
        )}
        <CardContent className="px-0 pb-0">
          <CarrierRoutesManager routes={provider.carrierRoutes} readOnly={!canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
