"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface UseResourceEditOptions {
  endpoint: string;
  redirectHref: string;
}

interface UseResourceEditResult<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  isLoaded: boolean;
  error: string | null;
  isSubmitting: boolean;
  handleSubmit: (formData: unknown) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useResourceEdit<T>({
  endpoint,
  redirectHref,
}: UseResourceEditOptions): UseResourceEditResult<T> {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<T | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${endpoint}/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setIsLoaded(true); })
      .catch(() => { setError("Error al cargar"); setIsLoaded(true); });
  }, [id, endpoint]);

  async function handleSubmit(formData: unknown) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      router.push(redirectHref);
    } catch {
      setError("Error al eliminar");
    }
  }

  return { data, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete };
}
