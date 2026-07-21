"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { formatPhone } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { UserRole } from "@/types/user.types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

import type { User } from "@/types/user.types";

type ProviderData = User;

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { permissions, isLoaded: permissionsLoaded } = useCollaboratorPermissions();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

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
        <p className="text-destructive text-sm">
          {error ?? "No autorizado"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Header con botón atrás */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link
              href="/collaborator/dashboard/providers"
              aria-label="Volver a proveedores"
            >
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            {provider.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.image}
                alt={provider.name}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials(provider.name)}
              </div>
            )}
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

      {/* Grid de tarjetas: Cuenta y Perfil */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tarjeta de Cuenta */}
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
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {/* Tarjeta de Perfil */}
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
                <InfoRow label="Razón social" value={provider.profile.legalName} />
                <InfoRow label="RFC" value={provider.profile.rfc} />
              </>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                Este proveedor no tiene perfil registrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {provider.profile?.address && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm whitespace-pre-wrap">{provider.profile.address}</p>
          </CardContent>
        </Card>
      )}

      {provider.profile?.contacts && provider.profile.contacts.length > 0 && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base sm:text-lg">
              Contactos ({provider.profile.contacts.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Personas de contacto asociadas a este proveedor.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {provider.profile.contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">
                        {contact.personName || (contact.type === "phone" ? "Teléfono" : "Correo")}
                      </p>
                      {contact.label && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.label}
                        </Badge>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-xs text-muted-foreground">{contact.position}</p>
                    )}
                    <p className="text-sm font-mono text-muted-foreground">
                      {contact.type === "phone"
                        ? formatPhone(contact.value)
                        : contact.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
