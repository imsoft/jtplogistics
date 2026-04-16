"use client";

import { useState, useEffect, useCallback } from "react";
import { MoveRight, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RouteChangeDiff {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

interface RouteLogEntry {
  id: string;
  routeId: string;
  routeLabel: string;
  action: "created" | "updated" | "deleted";
  userId: string;
  userName: string;
  changes: RouteChangeDiff[] | null;
  snapshot: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_CONFIG = {
  created: { label: "Creada",     icon: Plus,   color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/30" },
  updated: { label: "Modificada", icon: Pencil,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  deleted: { label: "Eliminada",  icon: Trash2,  color: "text-destructive",                    bg: "bg-red-50 dark:bg-red-950/30" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ChangesDetail({ changes }: { changes: RouteChangeDiff[] }) {
  return (
    <div className="mt-2 space-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs">
      {changes.map((c) => (
        <div key={c.field} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="font-medium text-foreground">{c.label}:</span>
          {c.from !== null && (
            <span className="text-muted-foreground line-through">{c.from}</span>
          )}
          {c.from !== null && c.to !== null && (
            <MoveRight className="size-3 shrink-0 text-muted-foreground" />
          )}
          {c.to !== null && (
            <span className="text-foreground">{c.to}</span>
          )}
          {c.to === null && (
            <span className="text-muted-foreground italic">eliminado</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LogRow({ log }: { log: RouteLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[log.action];
  const Icon = cfg.icon;
  const hasDetail = log.changes && log.changes.length > 0;

  return (
    <div className={`border-b last:border-b-0 px-4 py-3 ${expanded ? "bg-muted/30" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 rounded-full p-1.5 ${cfg.bg}`}>
          <Icon className={`size-3.5 ${cfg.color}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            <span className="text-sm font-medium">{log.routeLabel}</span>
            <span className="text-xs text-muted-foreground">por {log.userName}</span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {formatDateTime(log.createdAt)}
            </span>
          </div>

          {hasDetail && expanded && <ChangesDetail changes={log.changes!} />}
        </div>

        {hasDetail && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Ocultar cambios" : "Ver cambios"}
          >
            {expanded
              ? <ChevronDown className="size-3.5" />
              : <ChevronRight className="size-3.5" />
            }
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CollaboratorRouteLogsPage() {
  const [logs, setLogs] = useState<RouteLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const take = 25;

  const fetchLogs = useCallback(async (s: number) => {
    const params = new URLSearchParams({ skip: String(s), take: String(take) });
    const res = await fetch(`/api/collaborator/route-logs?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setLogs((prev) => s === 0 ? data.logs : [...prev, ...data.logs]);
    setTotal(data.total);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    setSkip(0);
    setLogs([]);
    setIsLoaded(false);
    fetchLogs(0);
  }, [fetchLogs]);

  function loadMore() {
    const next = skip + take;
    setSkip(next);
    fetchLogs(next);
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Historial de rutas</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Cambios registrados en las rutas del sistema.
        </p>
      </div>
      <Separator />

      {!isLoaded ? (
        <p className="text-sm text-muted-foreground py-4">Cargando historial…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay cambios registrados aún.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border overflow-hidden">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>

          {logs.length < total && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Cargar más ({total - logs.length} restantes)
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Mostrando {logs.length} de {total} entradas
          </p>
        </div>
      )}
    </div>
  );
}
