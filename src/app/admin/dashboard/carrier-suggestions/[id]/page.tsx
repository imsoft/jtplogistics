"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CARRIER_SUGGESTION_STATUSES,
  CARRIER_SUGGESTION_STATUS_LABELS,
} from "@/lib/constants/carrier-suggestion-status";
import type { CarrierSuggestion } from "@/types/carrier-suggestion.types";

export default function AdminCarrierSuggestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<CarrierSuggestion | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("pending");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const res = await fetch(`/api/admin/carrier-suggestions/${id}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setLoadError(data.error ?? "No encontrado");
          return;
        }
        if (!cancelled) {
          setRow(data as CarrierSuggestion);
          setStatusDraft((data as CarrierSuggestion).status);
        }
      } catch {
        if (!cancelled) setLoadError("Error al cargar");
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSaveStatus() {
    if (!row) return;
    setStatusError(null);
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/admin/carrier-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error ?? "No se pudo guardar");
        return;
      }
      setRow((prev) => (prev ? { ...prev, status: statusDraft } : prev));
    } catch {
      setStatusError("Error de conexión");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/carrier-suggestions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "No se pudo eliminar");
        return;
      }
      router.push("/admin/dashboard/carrier-suggestions");
    } catch {
      setDeleteError("Error al eliminar");
    }
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (loadError || !row) {
    return (
      <div className="min-w-0 space-y-4">
        <p className="text-destructive text-sm">{loadError ?? "No encontrado"}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard/carrier-suggestions">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={row.title}
        description="Detalle de la sugerencia y gestión del estado."
        backHref="/admin/dashboard/carrier-suggestions"
        backLabel="Volver al listado"
        deleteTitle="¿Eliminar sugerencia?"
        deleteDescription="Se eliminará permanentemente del sistema."
        onDelete={handleDelete}
      />

      {deleteError && (
        <p className="text-destructive text-sm">{deleteError}</p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transportista</CardTitle>
          <CardDescription>Quien envió la sugerencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nombre: </span>
            {row.carrierName ?? "—"}
          </p>
          {row.carrierEmail ? (
            <p>
              <span className="text-muted-foreground">Correo: </span>
              {row.carrierEmail}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {row.description ? (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {row.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Sin descripción.</p>
          )}
          <Separator />
          <p className="text-muted-foreground text-xs">
            Enviada el{" "}
            {new Date(row.createdAt).toLocaleString("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Label htmlFor="cs-status">Estado de la sugerencia</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Select value={statusDraft} onValueChange={setStatusDraft}>
            <SelectTrigger id="cs-status" className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_SUGGESTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CARRIER_SUGGESTION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={statusSaving || statusDraft === row.status}
            onClick={handleSaveStatus}
          >
            {statusSaving ? "Guardando…" : "Guardar estado"}
          </Button>
        </div>
        {statusError && (
          <p className="text-destructive text-sm">{statusError}</p>
        )}
      </div>
    </div>
  );
}
