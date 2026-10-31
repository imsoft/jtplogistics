import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bloque de un formulario largo: tarjeta con ícono, título, para qué sirve y
 * sus campos. Es el estándar de formularios de la plataforma: los campos se
 * agrupan por tema en lugar de ir en una sola cuadrícula.
 */
export function FormSection({
  icon: Icon,
  title,
  description,
  aside,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Algo a la derecha del título, p. ej. una etiqueta "Confidencial". */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border">
      {/* flex-wrap: si el `aside` no cabe junto al título (celular), baja de renglón. */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3.5 sm:px-5">
        <span className="bg-primary/[0.08] text-primary grid size-9 shrink-0 place-items-center rounded-lg" aria-hidden>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-[12rem] flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
        {aside}
      </header>
      <div className={cn("p-4 sm:p-5", className)}>{children}</div>
    </section>
  );
}

/**
 * Texto de una etiqueta con su asterisco de obligatorio pegado (Label usa
 * `gap`, así que van juntos dentro de un mismo span).
 */
export function RequiredText({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children}
      <span className="text-destructive" aria-hidden>*</span>
    </span>
  );
}
