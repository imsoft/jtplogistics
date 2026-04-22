"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const UNIT_TYPE_MAP: Record<string, string> = {
  "14CJ SENC 48 FT": "caja_seca",
  "37 CJ SENC 40 FT": "caja_seca",
  "30 TORTON ENTAR": "torton",
  "17 FULL CJ 40 FT": "caja_full",
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  caja_seca: "Caja seca",
  torton: "Tortón",
  caja_full: "Caja full",
};

interface ImportRoute {
  origin: string;
  destination: string;
  unitType: string;
  rawUnitType: string;
  hasUnknownUnitType: boolean;
  status: "pending" | "importing" | "success" | "error" | "skipped" | "duplicate";
  message?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Aliases: nombre normalizado → nombre correcto en el sistema
const CITY_ALIASES: Record<string, string> = {
  "tlajomulco": "Tlajomulco de Zúñiga",
  "tlajomulco de zuñiga": "Tlajomulco de Zúñiga",
  "tehuacan": "Tehuacán",
  "tecamac": "Tecamachalco",
};

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseCity(raw: string): string {
  const city = raw.replace(/,\s*[A-Za-z]{2,3}$/, "").trim();
  const titleCase = toTitleCase(city);
  return CITY_ALIASES[titleCase.toLowerCase()] ?? titleCase;
}

function parseInput(text: string): ImportRoute[] {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ImportRoute[] = [];

  for (const line of lines) {
    let cols: string[];
    if (line.includes("\t")) {
      cols = line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
    } else {
      cols = parseCSVLine(line);
    }

    if (cols.length < 3) continue;

    const [rawUnitType, rawOrigin, rawDestination] = cols;

    // Omitir encabezado
    if (
      rawUnitType.toLowerCase().includes("tipo") ||
      rawUnitType.toLowerCase().includes("equipo")
    )
      continue;

    if (!rawUnitType || !rawOrigin || !rawDestination) continue;

    const mappedUnitType = UNIT_TYPE_MAP[rawUnitType] ?? null;
    const unitType = mappedUnitType ?? rawUnitType.toLowerCase().replace(/\s+/g, "_");
    const origin = parseCity(rawOrigin);
    const destination = parseCity(rawDestination);

    if (!origin || !destination) continue;

    result.push({
      origin,
      destination,
      unitType,
      rawUnitType,
      hasUnknownUnitType: !mappedUnitType,
      status: "pending",
    });
  }

  return result;
}

export function RoutesBulkImport() {
  const [inputText, setInputText] = useState("");
  const [routes, setRoutes] = useState<ImportRoute[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleParse() {
    setRoutes(parseInput(inputText));
    setIsParsed(true);
    setImportDone(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputText(ev.target?.result as string);
      setIsParsed(false);
      setImportDone(false);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    setIsImporting(true);
    setImportDone(false);

    const updated = [...routes];
    const importedKeys = new Set<string>();

    for (let i = 0; i < updated.length; i++) {
      if (
        updated[i].status === "success" ||
        updated[i].status === "skipped" ||
        updated[i].status === "duplicate"
      )
        continue;

      const key = `${updated[i].origin}|||${updated[i].destination}|||${updated[i].unitType}`;

      // Duplicada dentro del mismo lote
      if (importedKeys.has(key)) {
        updated[i] = { ...updated[i], status: "duplicate", message: "Duplicada en el lote" };
        setRoutes([...updated]);
        continue;
      }

      updated[i] = { ...updated[i], status: "importing" };
      setRoutes([...updated]);

      try {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: updated[i].origin,
            destination: updated[i].destination,
            unitTargets: [{ unitType: updated[i].unitType }],
            status: "active",
          }),
        });

        const body = await res.json().catch(() => ({}));

        if (res.ok) {
          updated[i] = { ...updated[i], status: "success" };
          importedKeys.add(key);
        } else if (res.status === 409) {
          updated[i] = { ...updated[i], status: "skipped", message: "Ya existe" };
        } else {
          updated[i] = {
            ...updated[i],
            status: "error",
            message: body.error ?? "Error al crear",
          };
        }
      } catch {
        updated[i] = { ...updated[i], status: "error", message: "Error de red" };
      }

      setRoutes([...updated]);
    }

    setIsImporting(false);
    setImportDone(true);
  }

  const pendingCount = routes.filter((r) => r.status === "pending").length;
  const successCount = routes.filter((r) => r.status === "success").length;
  const skippedCount = routes.filter((r) => r.status === "skipped").length;
  const duplicateCount = routes.filter((r) => r.status === "duplicate").length;
  const errorCount = routes.filter((r) => r.status === "error").length;
  const unknownCount = routes.filter((r) => r.hasUnknownUnitType).length;

  return (
    <div className="space-y-6">
      {/* Referencia de mapeo */}
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="mb-2 font-medium">Mapeo de tipos de unidad</p>
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {Object.entries(UNIT_TYPE_MAP).map(([raw, val]) => (
            <div key={raw} className="flex items-center gap-2">
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{raw}</code>
              <span>→</span>
              <span className="font-medium text-foreground">{UNIT_TYPE_LABELS[val] ?? val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entrada de datos */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">Datos del Excel</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 size-3.5" />
            Subir CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Copia las celdas directamente desde Excel y pégalas aquí (o sube un archivo CSV).
          Formato esperado: <strong>Tipo de Equipo | Origen | Destino</strong> — una fila por línea.
        </p>
        <textarea
          className="min-h-[180px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={
            "14CJ SENC 48 FT\tCUAUTITLAN, MEX\tTECAMAC, MEX\n17 FULL CJ 40 FT\tTEHUACAN, PUE\tCARDENAS, TAB\n30 TORTON ENTAR\tTEHUACAN, PUE\tHUAJUAPAN, OAX"
          }
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsParsed(false);
            setImportDone(false);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!inputText.trim()}
          onClick={handleParse}
        >
          <FileText className="mr-1.5 size-3.5" />
          Previsualizar rutas
        </Button>
      </div>

      {isParsed && routes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No se encontraron rutas válidas. Verifica el formato de los datos.
        </p>
      )}

      {isParsed && routes.length > 0 && (
        <div className="space-y-4">
          <Separator />

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{routes.length} rutas detectadas</span>
            {unknownCount > 0 && (
              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                <AlertCircle className="size-3" />
                {unknownCount} con tipo desconocido
              </Badge>
            )}
            {importDone && (
              <>
                {successCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    <CheckCircle2 className="size-3" />
                    {successCount} creadas
                  </Badge>
                )}
                {skippedCount > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {skippedCount} ya existían
                  </Badge>
                )}
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {duplicateCount} duplicadas en el lote
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                    <XCircle className="size-3" />
                    {errorCount} con error
                  </Badge>
                )}
              </>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="w-10 px-3 py-2 text-center font-medium text-muted-foreground">#</th>
                  <th className="px-3 py-2 font-medium">Origen</th>
                  <th className="px-3 py-2 font-medium">Destino</th>
                  <th className="px-3 py-2 font-medium">Tipo de unidad</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{route.origin}</td>
                    <td className="px-3 py-2 font-mono text-xs">{route.destination}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={
                          route.hasUnknownUnitType
                            ? "border border-yellow-400 bg-yellow-50 text-yellow-700"
                            : ""
                        }
                        title={
                          route.hasUnknownUnitType
                            ? `Tipo no reconocido: ${route.rawUnitType}`
                            : undefined
                        }
                      >
                        {UNIT_TYPE_LABELS[route.unitType] ?? route.unitType}
                        {route.hasUnknownUnitType && (
                          <AlertCircle className="ml-1 size-3 text-yellow-500" />
                        )}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {route.status === "pending" && (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                      {route.status === "importing" && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Loader2 className="size-3 animate-spin" />
                          Importando…
                        </span>
                      )}
                      {route.status === "success" && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="size-3" />
                          Creada
                        </span>
                      )}
                      {route.status === "skipped" && (
                        <span className="text-xs text-muted-foreground">Ya existía</span>
                      )}
                      {route.status === "duplicate" && (
                        <span className="text-xs text-muted-foreground">Duplicada</span>
                      )}
                      {route.status === "error" && (
                        <span
                          className="flex items-center gap-1 text-xs text-red-600"
                          title={route.message}
                        >
                          <XCircle className="size-3" />
                          {route.message ?? "Error"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!importDone && (
            <Button
              type="button"
              disabled={isImporting || pendingCount === 0}
              onClick={handleImport}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importando…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Importar {pendingCount} ruta{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}

          {importDone && errorCount === 0 && (
            <p className="text-sm text-green-600">
              Importación completada. {successCount} ruta
              {successCount !== 1 ? "s" : ""} creada{successCount !== 1 ? "s" : ""}
              {skippedCount > 0
                ? `, ${skippedCount} omitida${skippedCount !== 1 ? "s" : ""} (ya existían en el sistema)`
                : ""}
              {duplicateCount > 0
                ? `, ${duplicateCount} duplicada${duplicateCount !== 1 ? "s" : ""} en el lote`
                : ""}
              .
            </p>
          )}
          {importDone && errorCount > 0 && (
            <p className="text-sm text-red-600">
              Importación finalizada con {errorCount} error{errorCount !== 1 ? "es" : ""}. Revisa
              las filas marcadas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
