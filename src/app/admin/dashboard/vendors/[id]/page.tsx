"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import type { Vendor } from "@/types/resources.types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function VendorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: vendor, isLoaded, error } = useResourceEdit<Vendor>({
    endpoint: "/api/admin/vendors",
    redirectHref: "/admin/dashboard/vendors",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !vendor) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/vendors" aria-label="Volver a vendedores">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {vendor.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.image}
                alt={vendor.name}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials(vendor.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="page-heading truncate">{vendor.name}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">{vendor.email}</p>
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/admin/dashboard/vendors/${id}/edit`}>
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
            <InfoRow label="Puesto" value={vendor.position} />
            <InfoRow label="Correo" value={vendor.email} />
            <InfoRow
              label="Fecha de nacimiento"
              value={
                vendor.birthDate
                  ? new Date(vendor.birthDate).toLocaleDateString("es-MX", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : null
              }
            />
            <InfoRow
              label="Registro"
              value={new Date(vendor.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
