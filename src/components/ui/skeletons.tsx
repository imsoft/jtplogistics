import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** Skeleton que imita la DataTable (toolbar de búsqueda + filas + paginación). */
export function DataTableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-24 shrink-0" />
      </div>
      <div className="overflow-hidden rounded-md border">
        <div className="bg-muted/40 flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 && "max-w-[35%]")}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/** Encabezado de página (título + descripción + acción) seguido de un separador. */
export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 sm:w-56" />
          <Skeleton className="h-3 w-56 sm:w-72" />
        </div>
        {withAction ? (
          <Skeleton className="h-9 w-full shrink-0 sm:w-36" />
        ) : null}
      </div>
      <Separator />
    </>
  );
}

/** Skeleton para formularios (campos etiquetados + acciones). */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/** Skeleton para páginas de detalle (encabezado + bloques de información). */
export function DetailSkeleton() {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton para páginas de listado (encabezado + tabla). */
export function ListPageSkeleton() {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeaderSkeleton />
      <DataTableSkeleton />
    </div>
  );
}

/** Skeleton para dashboards de inicio (tarjetas de métricas + gráfica). */
export function DashboardHomeSkeleton() {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border p-5 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="space-y-4 rounded-xl border p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Lista de tarjetas apiladas: la usan las pantallas que no son tabla sino
 * bloques (mantenimientos, reportes de equipo, sugerencias, comentarios).
 */
export function CardListSkeleton({
  cards = 3,
  lines = 2,
  withAvatar = false,
  className,
}: {
  cards?: number;
  lines?: number;
  withAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border p-4">
          {withAvatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            </div>
            {Array.from({ length: lines }).map((_, l) => (
              <Skeleton key={l} className={cn("h-3", l === lines - 1 ? "w-1/2" : "w-full")} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Ficha de un recurso: encabezado con foto y nombre, y debajo los renglones de
 * datos. Es la forma de las pantallas /[id] (cliente, laptop, colaborador…).
 */
export function ResourceDetailSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-full shrink-0 sm:w-28" />
      </div>
      <div className="rounded-xl border p-4 sm:p-5">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Perfil: foto grande y los campos de la cuenta. */
export function ProfileSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <FormSkeleton fields={4} />
    </div>
  );
}

/** Conversación: burbujas alternadas y el campo para escribir. */
export function ChatSkeleton({ messages = 5 }: { messages?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: messages }).map((_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton className={cn("h-14 rounded-2xl", i % 2 === 0 ? "w-3/5" : "w-2/5")} />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Vista previa de un correo: el asunto y el cuerpo de la plantilla. */
export function EmailPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto h-5 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mx-auto h-9 w-40 rounded-lg" />
      </div>
    </div>
  );
}
