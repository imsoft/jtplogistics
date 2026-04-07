"use client";

import { useState, useEffect, useCallback } from "react";
import { MoveRight, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

interface AuditLogEntry {
  id: string;
  resource: string;
  resourceId: string;
  resourceLabel: string;
  action: "created" | "updated" | "deleted";
  userId: string;
  userName: string;
  changes: AuditChange[] | null;
  createdAt: string;
}

const ACTION_CONFIG = {
  created: { label: "Creado",      icon: Plus,   color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/30" },
  updated: { label: "Modificado",  icon: Pencil, color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  deleted: { label: "Eliminado",   icon: Trash2, color: "text-destructive",                    bg: "bg-red-50 dark:bg-red-950/30" },
};

const RESOURCE_LABELS: Record<string, string> = {
  route: "Ruta",
  client: "Cliente",
  vendor: "Proveedor",
  employee: "Empleado",
  laptop: "Laptop",
  phone: "Teléfono",
  email: "Correo",
  unit_type: "Tipo de unidad",
  task: "Tarea",
  idea: "Idea",
  settings: "Configuración",
  user_setting: "Permiso de usuario",
  client_routes: "Rutas de cliente",
  carrier_routes: "Selección de rutas",
  message: "Mensaje",
  profile: "Perfil",
  carrier_suggestion: "Sugerencia de transportista",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ChangesDetail({ changes }: { changes: AuditChange[] }) {
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

function LogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[log.action];
  const Icon = cfg.icon;
  const hasDetail = log.changes && log.changes.length > 0;
  const resourceType = RESOURCE_LABELS[log.resource] ?? log.resource;

  return (
    <div className={`border-b last:border-b-0 px-4 py-3 ${expanded ? "bg-muted/30" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 rounded-full p-1.5 ${cfg.bg}`}>
          <Icon className={`size-3.5 ${cfg.color}`} />
        </span>

        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground">{resourceType}:</span>
          <span className="text-sm font-medium truncate">{log.resourceLabel}</span>
          <span className="text-xs text-muted-foreground">por {log.userName}</span>
        </div>

        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>

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

      {hasDetail && expanded && (
        <div className="ml-9">
          <ChangesDetail changes={log.changes!} />
        </div>
      )}
    </div>
  );
}

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [resourceFilter, setResourceFilter] = useState<string>("__all__");
  const take = 25;

  const fetchLogs = useCallback(async (s: number, resource: string) => {
    const params = new URLSearchParams({ skip: String(s), take: String(take) });
    if (resource !== "__all__") params.set("resource", resource);
    const res = await fetch(`/api/admin/audit-logs?${params}`);
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
    fetchLogs(0, resourceFilter);
  }, [fetchLogs, resourceFilter]);

  function loadMore() {
    const next = skip + take;
    setSkip(next);
    fetchLogs(next, resourceFilter);
  }

  if (!isLoaded) {
    return <p className="text-sm text-muted-foreground py-4">Cargando historial…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay cambios registrados aún.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}

      {logs.length < total && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore}>
            Cargar más ({total - logs.length} restantes)
          </Button>
        </div>
      )}

      {logs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Mostrando {logs.length} de {total} entradas
        </p>
      )}
    </div>
  );
}
