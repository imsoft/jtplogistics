import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Tarjeta de resumen de las páginas de inicio. La comparten el admin, el
 * colaborador, el vendedor y el de soporte para que todos los paneles se vean
 * igual.
 */
export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  /** Resalta la tarjeta en rojo cuando el número pide atención. */
  accent?: boolean;
}

export function StatCard({ label, value, hint, icon, href, accent }: StatCardProps) {
  const content = (
    <Card
      className={`h-full transition-colors ${href ? "hover:border-primary/40" : ""} ${
        accent ? "border-destructive/40" : ""
      }`}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export function fmtInt(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

export function fmtMxn(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
