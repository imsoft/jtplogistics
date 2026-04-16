"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { formatPhone } from "@/lib/utils";
import type { Client } from "@/types/client.types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function CollaboratorClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoaded, error } = useResourceEdit<Client>({
    endpoint: "/api/collaborator/clients",
    redirectHref: "/collaborator/dashboard/clients",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !client) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/collaborator/dashboard/clients" aria-label="Volver a clientes">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <h1 className="page-heading truncate">{client.name}</h1>
              {client.legalName && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">{client.legalName}</p>
              )}
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/collaborator/dashboard/clients/${id}/edit`}>
            <Pencil className="size-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Nombre de contacto" value={client.contactName} />
            <InfoRow label="Puesto" value={client.position} />
            <InfoRow label="RFC" value={client.rfc} />
            <InfoRow label="Correo" value={client.email} />
            <InfoRow label="Teléfono" value={formatPhone(client.phone)} />
            <InfoRow label="Dirección" value={client.address} />
            <InfoRow
              label="Tipos de producto"
              value={
                client.productTypes.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {client.productTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Registro"
              value={new Date(client.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {(client.detentionConditions || client.notes) && (
          <Card>
            <CardContent className="px-4 py-4 space-y-4">
              {client.detentionConditions && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Condiciones de estadías
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{client.detentionConditions}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Notas
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
