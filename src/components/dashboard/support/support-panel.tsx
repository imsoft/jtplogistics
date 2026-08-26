"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MessageCircle, Phone, Plus, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import {
  getMyTicketColumns,
  formatTicketDate,
  ticketEquipment,
  TICKET_STATUS_STYLES,
} from "@/components/dashboard/support/ticket-columns";
import { IT_SUPPORT, TICKET_STATUS_LABELS, whatsappLink } from "@/lib/support";
import type { SupportTicketRow } from "@/types/support.types";

interface EquipmentItem {
  id: string;
  name: string;
  equipmentCode: string | null;
}

export function SupportPanel() {
  const [equipment, setEquipment] = useState<{ laptops: EquipmentItem[]; phones: EquipmentItem[] } | null>(null);
  const [tickets, setTickets] = useState<SupportTicketRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<SupportTicketRow | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [equipmentValue, setEquipmentValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/support/my-equipment")
      .then((r) => (r.ok ? r.json() : { laptops: [], phones: [] }))
      .then(setEquipment)
      .catch(() => setEquipment({ laptops: [], phones: [] }));
    loadTickets();
  }, []);

  function loadTickets() {
    fetch("/api/support/tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SupportTicketRow[]) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]));
  }

  // El valor del select lleva el tipo y el id juntos: "laptop:abc123".
  const equipmentOptions = [
    ...(equipment?.laptops ?? []).map((l) => ({
      value: `laptop:${l.id}`,
      label: `Laptop · ${l.name}${l.equipmentCode ? ` (${l.equipmentCode})` : ""}`,
    })),
    ...(equipment?.phones ?? []).map((p) => ({
      value: `phone:${p.id}`,
      label: `Celular · ${p.name}${p.equipmentCode ? ` (${p.equipmentCode})` : ""}`,
    })),
  ];

  const columns = useMemo(() => getMyTicketColumns(), []);

  function openForm() {
    setError(null);
    setSent(false);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    if (!title.trim()) { setError("Escribe de qué se trata."); return; }
    if (!description.trim()) { setError("Cuenta qué está pasando."); return; }

    setIsSending(true);
    try {
      const [kind, id] = equipmentValue ? equipmentValue.split(":") : [null, null];
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, equipmentKind: kind, equipmentId: id }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setError(data.error ?? "No se pudo enviar el reporte."); return; }
      setTitle(""); setDescription(""); setEquipmentValue("");
      setShowForm(false);
      setSent(true);
      loadTickets();
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Contacto directo ── */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wrench className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{IT_SUPPORT.name}</p>
              <p className="text-xs text-muted-foreground">
                Equipo de cómputo, celulares, correo y plataforma
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={whatsappLink("Hola, necesito apoyo con mi equipo.")} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:+52${IT_SUPPORT.phone}`}>
                <Phone className="size-4" />
                {IT_SUPPORT.phoneLabel}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${IT_SUPPORT.email}`} className="text-email">
                <Mail className="size-4" />
                Correo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Mis reportes ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Mis reportes
          </h2>
          <p className="text-xs text-muted-foreground">
            Para algo urgente, WhatsApp o teléfono. Si no corre prisa, déjalo aquí
            y queda registrado.
          </p>
        </div>
        <Button onClick={openForm} className="shrink-0">
          <Plus className="size-4" />
          Reportar un problema
        </Button>
      </div>

      {sent && (
        <p className="text-sm font-medium text-green-600">
          Reporte enviado. Soporte ya recibió el aviso.
        </p>
      )}

      {!tickets ? (
        <DataTableSkeleton />
      ) : tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Todavía no has reportado nada.
        </p>
      ) : (
        <DataTable<SupportTicketRow, unknown>
          columns={columns}
          data={tickets}
          filterColumn="search"
          filterPlaceholder="Buscar en mis reportes…"
          getRowId={(row) => row.id}
          onRowClick={setDetail}
        />
      )}

      {/* ── Formulario ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reportar un problema</DialogTitle>
            <DialogDescription>
              Queda registrado y le llega el aviso a soporte de TI.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-title">¿De qué se trata?</Label>
              <Input
                id="ticket-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-equipment">Equipo</Label>
              <AppSelect
                value={equipmentValue}
                onValueChange={setEquipmentValue}
                options={equipmentOptions}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {equipmentOptions.length === 0
                  ? "No tienes equipo asignado en la plataforma; puedes reportar igual."
                  : "Opcional. Si el problema es de un equipo tuyo, elígelo."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-description">¿Qué está pasando?</Label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Entre más detalle, más rápido se resuelve: desde cuándo pasa, qué
                aparece en pantalla, si ya lo reiniciaste.
              </p>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {isSending ? "Enviando…" : "Enviar reporte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detalle de un reporte ── */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>
                  Reportado el {formatTicketDate(detail.createdAt)}
                  {ticketEquipment(detail) ? ` · ${ticketEquipment(detail)}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Badge className={TICKET_STATUS_STYLES[detail.status]}>
                  {TICKET_STATUS_LABELS[detail.status]}
                </Badge>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Lo que reportaste
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{detail.description}</p>
                </div>

                {detail.resolution && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Respuesta de soporte
                      {detail.resolvedAt ? ` · ${formatTicketDate(detail.resolvedAt)}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{detail.resolution}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
