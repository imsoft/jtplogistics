"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportFileBase, type ExportData } from "@/lib/table-export";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * "Exportar" → Excel o PDF de lo que la tabla muestra con sus filtros.
 * `getData` arma los datos al momento de exportar (todas las filas filtradas,
 * no solo la página visible).
 */
export function ExportMenu({
  title,
  getData,
  subtitle,
}: {
  title: string;
  getData: () => ExportData | Promise<ExportData>;
  /** Línea bajo el título del PDF (p. ej. los filtros aplicados). */
  subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run(kind: "xlsx" | "pdf") {
    setBusy(true);
    try {
      const data = await getData();
      if (data.rows.length === 0) {
        toast.error("No hay filas que exportar con estos filtros.");
        return;
      }
      const base = exportFileBase(title);
      if (kind === "xlsx") {
        const { downloadXlsxFromAoa } = await import("@/lib/excel-export");
        await downloadXlsxFromAoa(`${base}.xlsx`, title.slice(0, 31), [data.headers, ...data.rows]);
      } else {
        const [{ pdf }, { TablePdf }] = await Promise.all([import("@react-pdf/renderer"), import("./table-pdf")]);
        const blob = await pdf(
          <TablePdf title={title} subtitle={subtitle} data={data} logoUrl={`${window.location.origin}/images/logo/jtp-logistics.png`} />
        ).toBlob();
        download(blob, `${base}.pdf`);
      }
      toast.success(kind === "xlsx" ? "Excel descargado." : "PDF descargado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="size-4" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}>
          <FileText className="size-4" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
