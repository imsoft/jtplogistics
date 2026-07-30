"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { FormSkeleton } from "@/components/ui/skeletons";
import { MuralEntryForm } from "@/components/dashboard/mural/mural-entry-form";
import type { MuralEntry, MuralEntryFormData } from "@/types/mural.types";

/** Igual que en las publicaciones: el payload no se normaliza a minúsculas. */
async function submitEntry(
  url: string,
  method: "POST" | "PATCH",
  data: MuralEntryFormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? "No se pudo guardar" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Error de conexión" };
  }
}

export function MuralEntryCreate({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: MuralEntryFormData) {
    setError(null);
    setIsSubmitting(true);
    const result = await submitEntry("/api/mural/entries", "POST", data);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(basePath);
  }

  return (
    <ResourceNewPage
      title="Nueva entrada"
      description="Evento, capacitación o vacaciones"
      backHref={basePath}
      backLabel="Volver al mural"
      error={error}
    >
      <MuralEntryForm
        submitLabel="Publicar en el mural"
        cancelHref={basePath}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}

export function MuralEntryEdit({ id, basePath }: { id: string; basePath: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<MuralEntry | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/mural/entries/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: MuralEntry) => setEntry(data))
      .catch(() => setError("No se pudo cargar la entrada."))
      .finally(() => setIsLoaded(true));
  }, [id]);

  async function handleSubmit(data: MuralEntryFormData) {
    setError(null);
    setIsSubmitting(true);
    const result = await submitEntry(`/api/mural/entries/${id}`, "PATCH", data);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(basePath);
  }

  return (
    <ResourceNewPage
      title="Editar entrada"
      description={entry?.title ?? "Entrada del mural"}
      backHref={basePath}
      backLabel="Volver al mural"
      error={error}
    >
      {!isLoaded ? (
        <FormSkeleton fields={6} />
      ) : entry ? (
        <MuralEntryForm
          initialValues={entry}
          submitLabel="Guardar cambios"
          cancelHref={basePath}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          showNotifyToggle={false}
        />
      ) : null}
    </ResourceNewPage>
  );
}
