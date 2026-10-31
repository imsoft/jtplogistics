import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  submitLabel: string;
  cancelHref: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  /**
   * Fija la barra al pie de la pantalla (de tablet en adelante): en formularios largos el botón de
   * guardar queda siempre a la vista.
   */
  sticky?: boolean;
  /** Acciones secundarias a la izquierda (p. ej. generar un PDF). */
  leading?: React.ReactNode;
}

export function FormActions({
  submitLabel,
  cancelHref,
  isSubmitting = false,
  submitDisabled = false,
  sticky = false,
  leading,
}: FormActionsProps) {
  return (
    <ActionBar sticky={sticky}>
      {leading && <div className="sm:mr-auto">{leading}</div>}
      <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
        <Link href={cancelHref}>Cancelar</Link>
      </Button>
      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || submitDisabled}>
        {submitLabel}
      </Button>
    </ActionBar>
  );
}

/**
 * Fila de botones al pie de un formulario. Con `sticky` se queda fija abajo
 * de tablet en adelante; en celular los botones apilados taparían media
 * pantalla, así que ahí van al final.
 */
export function ActionBar({ sticky = false, className, children }: { sticky?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end",
        sticky && "sm:bg-background/95 sm:supports-[backdrop-filter]:bg-background/80 sm:sticky sm:bottom-0 sm:z-10 sm:-mx-6 sm:border-t sm:px-6 sm:py-3 sm:backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}
