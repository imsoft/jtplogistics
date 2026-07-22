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
import { groupContactsByPerson } from "@/lib/contacts";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DataTableSkeleton } from "@/components/ui/skeletons";
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
  }, [permissionsLoaded, permissions, id]);

  if (!permissionsLoaded || !isLoaded) {
    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
        <DataTableSkeleton />
      </div>
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
              <p className="text-muted-foreground truncate text-xs sm:text-sm">
                {provider.email}
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          <Lock className="size-3 mr-1" />
          Solo lectura
        </Badge>
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

      {/* Rutas seleccionadas (solo lectura) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rutas seleccionadas ({provider.carrierRoutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <CarrierRoutesManager routes={provider.carrierRoutes} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
