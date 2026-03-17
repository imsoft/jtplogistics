"use client";

import { useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientRoutesDialog } from "./client-routes-dialog";

export function ClientViewActions({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RouteIcon className="size-4" />
        Seleccionar rutas
      </Button>
      <ClientRoutesDialog clientId={clientId} open={open} onOpenChange={setOpen} />
    </>
  );
}
