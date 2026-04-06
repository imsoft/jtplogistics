"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Sin conexión</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          No hay conexión a internet. Revisa tu red y vuelve a intentarlo.
        </p>
      </div>
      <Button onClick={() => window.location.reload()} className="gap-2">
        <RefreshCw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
