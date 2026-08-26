"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { MaintenanceReportPdf, type ReportItem } from "./maintenance-report-pdf";

/** Primer día del mes en curso, que es el arranque natural de un corte. */
function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const KIND_LABELS: Record<string, string> = {
  all: "Preventivos y correctivos",
  preventive: "Solo preventivos",
  corrective: "Solo correctivos",
};

interface Props {
  items: ReportItem[];
  /** Nombre de quien descarga, para dejar constancia en el pie. */
  generatedBy: string;
}

export function MaintenanceReportButton({ items, generatedBy }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [kind, setKind] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Se filtra por la fecha en que se hizo; si todavía no se cierra, por la
   * fecha en que se programó. Así un mantenimiento aparece en el corte del mes
   * en que ocurrió, no en el que se capturó.
   */
  const selected = items.filter((m) => {
    if (kind !== "all" && m.kind !== kind) return false;
    const fecha = (m.performedAt ?? m.scheduledFor).slice(0, 10);
    return fecha >= from && fecha <= to;
  });

  async function handleDownload() {
    setError(null);
    if (from > to) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <MaintenanceReportPdf
          items={selected}
          from={from}
          to={to}
          kindLabel={KIND_LABELS[kind]}
          logoUrl={window.location.origin + "/images/logo/jtp-logistics.png"}
          generatedBy={generatedBy}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mantenimientos-${from}-a-${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setOpen(false);
    } catch (e) {
      console.error("Error al generar el reporte:", e);
      setError(
        `No se pudo generar el reporte: ${e instanceof Error ? e.message : "error desconocido"}`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0">
          <FileDown className="size-4" />
          Descargar reporte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reporte de mantenimientos</DialogTitle>
          <DialogDescription>
            PDF con la evidencia del periodo, para entregar en la auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rep-from">Desde</Label>
            <DatePicker id="rep-from" value={from} onChange={setFrom} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rep-to">Hasta</Label>
            <DatePicker id="rep-to" value={to} onChange={setTo} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rep-kind">Qué incluir</Label>
          <AppSelect
            value={kind}
            onValueChange={setKind}
            options={[
              { value: "all", label: "Preventivos y correctivos" },
              { value: "preventive", label: "Solo preventivos" },
              { value: "corrective", label: "Solo correctivos" },
            ]}
            className="w-full"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? "No hay mantenimientos en ese periodo."
            : selected.length === 1
              ? "Se incluirá 1 mantenimiento con su evidencia."
              : `Se incluirán ${selected.length} mantenimientos con su evidencia.`}
        </p>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isGenerating || selected.length === 0}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {isGenerating ? "Generando…" : "Descargar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
