"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { Badge } from "@/components/ui/badge";
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
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountId = params.id;
  const employeeId = searchParams.get("employeeId");
  const backHref = employeeId
    ? `/collaborator/dashboard/employees/${employeeId}`
    : "/collaborator/dashboard/employees";

  useEffect(() => {
    const query = employeeId ? `?employeeId=${employeeId}` : "";
    fetch(`/api/collaborator/emails/${accountId}${query}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "Error al cargar correo");
        return body as EmailAccount;
      })
      .then((data) => {
        setAccount(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, [accountId, employeeId]);

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !account) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={backHref} aria-label="Volver al colaborador">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{account.email}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">{emailTypeLabel(account.type)}</p>
          </div>
        </div>
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
