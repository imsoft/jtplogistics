"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
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

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Texto del botón que confirma. Por omisión "Confirmar". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón rojo: para borrar o algo que no se puede deshacer. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Un solo diálogo de confirmación para toda la app. Cualquier componente pide
 * `const confirm = useConfirm()` y hace `if (!(await confirm({...}))) return;`
 * antes de borrar o guardar cambios, sin montar su propio diálogo.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Si ya había uno abierto, se da por cancelado.
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>{options?.cancelLabel ?? "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction variant={options?.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
              {options?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm necesita un ConfirmProvider arriba.");
  return confirm;
}

/** Texto estándar para confirmar que se guardan cambios de un registro. */
export const SAVE_CHANGES: ConfirmOptions = {
  title: "¿Guardar los cambios?",
  description: "Se actualizará el registro con lo que capturaste.",
  confirmLabel: "Guardar",
};
