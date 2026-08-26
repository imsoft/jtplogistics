"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MessageCircle, Phone, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { IT_SUPPORT, TICKET_STATUS_LABELS, whatsappLink } from "@/lib/support";

interface EquipmentItem {
  id: string;
  name: string;
  equipmentCode: string | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: keyof typeof TICKET_STATUS_LABELS;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  laptop: { name: string } | null;
  phone: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function SupportPanel() {
  const [equipment, setEquipment] = useState<{ laptops: EquipmentItem[]; phones: EquipmentItem[] } | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
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
      .then((data: Ticket[]) => setTickets(Array.isArray(data) ? data : []))
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
      setSent(true);
      loadTickets();
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {/* ── Contacto directo ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Soporte de TI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
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

            <div className="grid gap-2 sm:grid-cols-3">
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
            <p className="text-xs text-muted-foreground">
              Para algo urgente, WhatsApp o teléfono. Si no corre prisa, deja el
              reporte aquí abajo y queda registrado.
            </p>
          </CardContent>
        </Card>

        {/* ── Reportar ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Reportar un problema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-title">¿De qué se trata?</Label>
                <Input id="ticket-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
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
              {sent && (
                <p className="text-sm font-medium text-green-600">
                  Reporte enviado. Soporte ya recibió el aviso.
                </p>
              )}

              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {isSending ? "Enviando…" : "Enviar reporte"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Historial propio ── */}
      <Card className="lg:sticky lg:top-6 lg:self-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Mis reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tickets ? (
            <DataTableSkeleton />
          ) : tickets.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Todavía no has reportado nada.
            </p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <Badge className={STATUS_STYLES[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(t.createdAt)}
                    {(t.laptop || t.phone) && ` · ${t.laptop?.name ?? t.phone?.name}`}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                  {t.resolution && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Respuesta de soporte
                      </p>
                      <p className="mt-1 text-sm">{t.resolution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
