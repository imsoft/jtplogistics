import * as React from "react";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[minmax(11rem,42%)_1fr] sm:gap-2 sm:items-start">
      <span className="text-muted-foreground text-xs sm:text-sm leading-snug">{label}</span>
      <span className="text-sm font-medium break-all">{value ?? "—"}</span>
    </div>
  );
}
