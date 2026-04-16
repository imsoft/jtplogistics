"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { formatPhone } from "@/lib/utils";
import type { PhoneDevice } from "@/types/resources.types";

export default function CollaboratorPhoneProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: phone, isLoaded, error } = useResourceEdit<PhoneDevice>({
    endpoint: "/api/collaborator/phones",
    redirectHref: "/collaborator/dashboard/phones",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !phone) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/collaborator/dashboard/phones" aria-label="Volver a celulares">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{phone.name}</h1>
            {phone.phoneNumber && (
              <p className="text-muted-foreground text-xs sm:text-sm truncate">{formatPhone(phone.phoneNumber)}</p>
            )}
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/collaborator/dashboard/phones/${id}/edit`}>
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
            <InfoRow label="Nombre" value={phone.name} />
            <InfoRow label="Número" value={phone.phoneNumber ? formatPhone(phone.phoneNumber) : null} />
            <InfoRow label="IMEI" value={phone.imei} />
            <InfoRow label="Asignado a" value={phone.assignedTo?.name ?? null} />
            <InfoRow label="Cuenta de correo" value={phone.emailAccount?.email ?? null} />
            <InfoRow
              label="Registro"
              value={new Date(phone.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
