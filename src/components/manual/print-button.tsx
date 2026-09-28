"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Imprime la página tal cual está publicada. En el diálogo del navegador se
 * elige "Guardar como PDF": así el PDF nunca se queda atrás de la página.
 */
export function PrintButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="size-4" />
      Imprimir o guardar PDF
    </Button>
  );
}
