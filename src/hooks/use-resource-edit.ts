"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { normalizePayloadToLowercase } from "@/lib/text-case";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";

interface UseResourceEditOptions {
  endpoint: string;
  redirectHref: string;
  /** Si se provee, se usa al eliminar en vez de redirectHref */
  deleteRedirectHref?: string;
}

interface UseResourceEditResult<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  isLoaded: boolean;
  error: string | null;
  isSubmitting: boolean;
  /** `skipConfirm` cuando la página ya confirmó por su cuenta. */
  handleSubmit: (formData: unknown, opts?: { skipConfirm?: boolean }) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useResourceEdit<T>({
  endpoint,
  redirectHref,
  deleteRedirectHref,
}: UseResourceEditOptions): UseResourceEditResult<T> {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<T | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    fetch(`${endpoint}/${id}`)
      .then(async (r) => {
        // Un 403/404 también trae JSON ({ error }); no es un registro.
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((body as { error?: string }).error ?? "No se pudo cargar");
        return body;
      })
      .then((d) => { setData(d); setIsLoaded(true); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Error al cargar"); setIsLoaded(true); });
  }, [id, endpoint]);

  async function handleSubmit(formData: unknown, opts?: { skipConfirm?: boolean }) {
    // Editar un registro existente siempre se confirma.
    if (!opts?.skipConfirm && !(await confirm(SAVE_CHANGES))) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedData = normalizePayloadToLowercase(formData);
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedData),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "No se pudo guardar");
        return;
      }
      router.push(redirectHref);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "No se pudo eliminar");
        return;
      }
      router.push(deleteRedirectHref ?? redirectHref);
    } catch {
      setError("Error al eliminar");
    }
  }

  return { data, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete };
}
