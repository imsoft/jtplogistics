"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { formatMxn } from "@/lib/utils";
import type { CarrierQuote } from "@/types/carrier-quote.types";

function TargetIndicator({
  carrierTarget,
  routeTarget,
}: {
  carrierTarget: number | null;
  routeTarget: number | null;
}) {
  if (carrierTarget == null || routeTarget == null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const diff = ((carrierTarget - routeTarget) / routeTarget) * 100;
  const abs = Math.abs(diff).toFixed(1);
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <TrendingUp className="size-3" /> +{abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
      <TrendingDown className="size-3" /> -{abs}%
    </span>
  );
}

export function getCarrierQuotesColumns(
  routeTarget: number | null
): ColumnDef<CarrierQuote>[] {
  return [
    {
      accessorKey: "company",
      header: ({ column }) => <SortableColumnHeader column={column} title="Empresa" />,
      cell: ({ row }) => {
        const company = row.getValue("company") as string | null;
        return company ? (
          <span className="font-medium">{company}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <span>{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | null;
        return phone ? (
          <span className="text-muted-foreground">{phone}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "carrierTarget",
      header: ({ column }) => <SortableColumnHeader column={column} title="Target" />,
      cell: ({ row }) => {
        const target = row.getValue("carrierTarget") as number | null;
        if (target == null) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="font-mono font-medium">${formatMxn(target)}</span>;
      },
    },
    {
      id: "vs",
      header: "vs. Ruta",
      cell: ({ row }) => (
        <TargetIndicator
          carrierTarget={row.getValue("carrierTarget")}
          routeTarget={routeTarget}
        />
      ),
    },
  ];
}
