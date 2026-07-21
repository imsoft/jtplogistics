"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { formatPhone } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface ProviderData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
}

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

  if (!permissionsLoaded || !isLoaded)
    return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (!permissions?.canViewProviders || error || !provider)
    return (
      <p className="text-destructive py-6 text-sm">
        {error ?? "No autorizado"}
      </p>
    );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link
              href="/collaborator/dashboard/providers"
              aria-label="Volver a proveedores"
            >
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
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
            <h1 className="page-heading truncate">{provider.name}</h1>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label="Correo" value={provider.email} />
            <InfoRow label="Teléfono" value={formatPhone(provider.phone)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
