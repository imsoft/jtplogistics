"use client";

import { useRef } from "react";
import { tableFromDom } from "@/lib/table-export";
import { ExportMenu } from "./export-menu";

/**
 * Envuelve una tabla propia (no DataTable) y le pone "Exportar": sale lo que
 * la tabla muestra en ese momento, con sus filtros y búsqueda.
 */
export function ExportableTable({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex justify-end">
        <ExportMenu title={title} subtitle={subtitle} getData={() => tableFromDom(ref.current)} />
      </div>
      <div ref={ref} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
