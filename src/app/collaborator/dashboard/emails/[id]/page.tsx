"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { Badge } from "@/components/ui/badge";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import type { EmailAccount } from "@/types/resources.types";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  administrative: "Administrativo / Qweb360",
  gmail: "Gmail",
  icloud: "iCloud",
  hotmail: "Hotmail",
  outlook: "Outlook",
  hosting: "Hosting",
  yahoo: "Yahoo",
};

function emailTypeLabel(type: string) {
  return EMAIL_TYPE_LABELS[type.toLowerCase()] ?? type;
}

export default function CollaboratorEmailProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: account, isLoaded, error } = useResourceEdit<EmailAccount>({
    endpoint: "/api/collaborator/emails",
    redirectHref: "/collaborator/dashboard/emails",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !account) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/collaborator/dashboard/emails" aria-label="Volver a correos">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{account.email}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">{emailTypeLabel(account.type)}</p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/collaborator/dashboard/emails/${id}/edit`}>
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
            <InfoRow label="Correo" value={account.email} />
            <InfoRow label="Tipo" value={emailTypeLabel(account.type)} />
            <InfoRow
              label="Asignados"
              value={
                account.assignees.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {account.assignees.map((a) => (
                      <Badge key={a.id} variant="secondary" className="font-normal">
                        {a.name}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "Sin asignar"
                )
              }
            />
            <InfoRow
              label="Registro"
              value={new Date(account.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
