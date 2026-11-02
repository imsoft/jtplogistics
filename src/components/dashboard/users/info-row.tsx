import * as React from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  /** El valor es un correo electrónico: se muestra en minúsculas. */
  isEmail?: boolean;
}

export function InfoRow({ label, value, isEmail = false }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[minmax(11rem,42%)_1fr] sm:gap-2 sm:items-start">
      <span className="text-muted-foreground text-xs sm:text-sm leading-snug">{label}</span>
      <span className={cn("text-sm font-medium break-all", isEmail && "text-email")}>
        {value ?? "—"}
      </span>
    </div>
  );
}
