"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Route } from "@/types/route.types";

interface RouteDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  onConfirm: () => void | Promise<boolean | void>;
}

export function RouteDeleteDialog({
  open,
  onOpenChange,
  route,
  onConfirm,
}: RouteDeleteDialogProps) {
  async function handleConfirm() {
    const result = await Promise.resolve(onConfirm());
    if (result !== false) onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar ruta?</AlertDialogTitle>
          <AlertDialogDescription>
            {route
              ? `Se eliminará la ruta ${route.origin} → ${route.destination}. Esta acción no se puede deshacer.`
              : "Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
