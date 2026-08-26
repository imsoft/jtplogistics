"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppSelect } from "@/components/ui/app-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { MAINTENANCE_KIND_LABELS, MAINTENANCE_STATUS_LABELS } from "@/lib/support";
import { fuzzyMatch } from "@/lib/search";
import { MaintenanceReportButton } from "./maintenance-report-button";

interface LogItem {
  id: string;
  kind: keyof typeof MAINTENANCE_KIND_LABELS;
  status: keyof typeof MAINTENANCE_STATUS_LABELS;
  description: string;
  findings: string | null;
  scheduledFor: string;
  performedAt: string | null;
  photos: { url: string }[] | null;
  laptop: { name: string; serialNumber: string | null; assignedTo: { name: string } | null } | null;
  phone: { name: string; serialNumber: string | null; assignedTo: { name: string } | null } | null;
  technician: { name: string };
  ticket: { title: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}

/** Bitácora de mantenimientos, solo para consultar. */
export function MaintenanceLog({ currentUserName }: { currentUserName: string }) {
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");

  useEffect(() => {
    fetch("/api/collaborator/maintenance")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: LogItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  if (!items) return <DataTableSkeleton />;

  const filtered = items.filter((m) => {
    if (kind !== "all" && m.kind !== kind) return false;
    if (!search.trim()) return true;
    const equipo = m.laptop?.name ?? m.phone?.name ?? "";
    const persona = m.laptop?.assignedTo?.name ?? m.phone?.assignedTo?.name ?? "";
    return (
      fuzzyMatch(equipo, search) ||
      fuzzyMatch(persona, search) ||
      fuzzyMatch(m.description, search) ||
      fuzzyMatch(m.findings ?? "", search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <MaintenanceReportButton items={items} generatedBy={currentUserName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <Label htmlFor="log-search">Buscar</Label>
          <Input id="log-search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs text-muted-foreground">Por equipo, responsable o lo que se hizo.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="log-kind">Tipo</Label>
          <AppSelect
            value={kind}
            onValueChange={setKind}
            options={[
              { value: "all", label: "Todos" },
              { value: "preventive", label: "Preventivos" },
              { value: "corrective", label: "Correctivos" },
            ]}
            className="w-full"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Wrench className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {items.length === 0
                ? "Todavía no hay mantenimientos registrados."
                : "Ningún mantenimiento coincide con la búsqueda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const equipo = m.laptop ?? m.phone;
            const Icon = m.kind === "preventive" ? ShieldCheck : Wrench;
            return (
              <div key={m.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{equipo?.name ?? "Equipo dado de baja"}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {MAINTENANCE_KIND_LABELS[m.kind]}
                      </Badge>
                      <Badge className={`text-[10px] ${STATUS_STYLES[m.status]}`}>
                        {MAINTENANCE_STATUS_LABELS[m.status]}
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {m.performedAt
                          ? `Realizado el ${formatDate(m.performedAt)}`
                          : `Programado para el ${formatDate(m.scheduledFor)}`}
                      </span>
                      <span>Responsable: {m.technician.name}</span>
                      {equipo?.serialNumber && <span>Serie: {equipo.serialNumber}</span>}
                      {equipo?.assignedTo?.name && <span>Usuario: {equipo.assignedTo.name}</span>}
                    </div>

                    <p className="mt-2 text-sm">{m.description}</p>

                    {m.findings && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Hallazgos y trabajo realizado
                        </p>
                        <p className="mt-1 text-sm">{m.findings}</p>
                      </div>
                    )}

                    {m.photos && m.photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.photos.map((p, i) => (
                          <a
                            key={p.url}
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="relative size-20 overflow-hidden rounded-lg border"
                          >
                            <Image src={p.url} alt={`Evidencia ${i + 1}`} fill className="object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
