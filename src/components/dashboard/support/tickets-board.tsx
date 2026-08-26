"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { TICKET_STATUS_LABELS } from "@/lib/support";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: keyof typeof TICKET_STATUS_LABELS;
  resolution: string | null;
  createdAt: string;
  reporter: { name: string; email: string };
  laptop: { name: string } | null;
  phone: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function TicketsBoard() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/developer/tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Ticket[]) => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(id: string, status: string, resolutionText?: string) {
    setSavingId(id);
    try {
      await fetch(`/api/developer/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(resolutionText !== undefined ? { resolution: resolutionText } : {}) }),
      });
      setOpenId(null);
      setResolution("");
      load();
    } finally {
      setSavingId(null);
    }
  }

  if (!tickets) return <DataTableSkeleton />;

  if (tickets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Wrench className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Nadie ha reportado problemas de equipo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => {
        const equipo = t.laptop?.name ?? t.phone?.name;
        return (
          <div key={t.id} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.reporter.name}
                  {equipo && ` · ${equipo}`}
                  {" · "}
                  {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(t.createdAt))}
                </p>
              </div>
              <Badge className={STATUS_STYLES[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>

            {t.resolution && (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resolución</p>
                <p className="mt-1 text-sm">{t.resolution}</p>
              </div>
            )}

            {openId === t.id ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor={`res-${t.id}`}>Cómo se resolvió</Label>
                <Textarea id={`res-${t.id}`} rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Le llega a quien lo reportó, así que explícalo en corto y claro.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenId(null)}>Cancelar</Button>
                  <Button size="sm" onClick={() => update(t.id, "resolved", resolution)} disabled={savingId === t.id}>
                    {savingId === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                    Marcar resuelto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <a href={`mailto:${t.reporter.email}?subject=${encodeURIComponent(`Soporte JTP · ${t.title}`)}`}>
                    <Mail className="size-4" />
                    Responder
                  </a>
                </Button>
                <AppSelect
                  value={t.status}
                  onValueChange={(v) => (v === "resolved" ? (setOpenId(t.id), setResolution(t.resolution ?? "")) : update(t.id, v))}
                  options={[
                    { value: "open", label: "Abierto" },
                    { value: "in_progress", label: "En proceso" },
                    { value: "resolved", label: "Resuelto" },
                  ]}
                  className="w-40"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
