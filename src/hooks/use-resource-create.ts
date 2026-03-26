"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizePayloadToLowercase } from "@/lib/text-case";

interface UseResourceCreateOptions {
  endpoint: string;
  redirectHref: string;
}

export function useResourceCreate({ endpoint, redirectHref }: UseResourceCreateOptions) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: unknown) {
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedData = normalizePayloadToLowercase(data);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedData),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "No se pudo crear");
        return;
      }
      router.push(redirectHref);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, handleSubmit };
}
