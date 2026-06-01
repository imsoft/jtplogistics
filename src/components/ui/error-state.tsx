"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
}

/** Estado de error reutilizable para los archivos error.tsx del App Router. */
export function ErrorState({
  error,
  reset,
  title = "Algo salió mal",
  description = "Ocurrió un error al cargar esta sección. Puedes intentar de nuevo.",
  homeHref,
}: ErrorStateProps) {
  useEffect(() => {
    // Registrar para diagnóstico (Sentry/console).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
        <TriangleAlert className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          {description}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground/70 text-xs">
            Código: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} size="sm">
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
        {homeHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={homeHref}>Volver al inicio</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface NotFoundStateProps {
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}

/** Estado 404 reutilizable para los archivos not-found.tsx del App Router. */
export function NotFoundState({
  title = "Página no encontrada",
  description = "La página que buscas no existe o fue movida.",
  homeHref = "/",
  homeLabel = "Volver al inicio",
}: NotFoundStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <SearchX className="size-7" />
      </div>
      <div className="space-y-1.5">
        <p className="text-primary text-4xl font-black tracking-tight">404</p>
        <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          {description}
        </p>
      </div>
      <Button asChild size="sm">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </div>
  );
}
