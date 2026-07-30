"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { FormSkeleton } from "@/components/ui/skeletons";
import { MuralPostForm } from "@/components/dashboard/mural/mural-post-form";
import type { MuralPost, MuralPostFormData } from "@/types/mural.types";

/**
 * El payload del mural se manda tal cual, sin pasar por
 * `normalizePayloadToLowercase`: el contenido del blog y las URLs de
 * Cloudinary distinguen mayúsculas.
 */
async function submitPost(
  url: string,
  method: "POST" | "PATCH",
  data: MuralPostFormData
): Promise<{ ok: true; post: MuralPost } | { ok: false; error: string }> {
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
    return { ok: true, post: (await res.json()) as MuralPost };
  } catch {
    return { ok: false, error: "Error de conexión" };
  }
}

export function MuralPostCreate({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: MuralPostFormData) {
    setError(null);
    setIsSubmitting(true);
    const result = await submitPost("/api/mural/posts", "POST", data);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`${basePath}/posts/${result.post.id}`);
  }

  return (
    <ResourceNewPage
      title="Nueva publicación"
      description="Noticia o comunicado del mural"
      backHref={basePath}
      backLabel="Volver al mural"
      error={error}
    >
      <MuralPostForm
        submitLabel="Publicar"
        cancelHref={basePath}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}

export function MuralPostEdit({ id, basePath }: { id: string; basePath: string }) {
  const router = useRouter();
  const [post, setPost] = useState<MuralPost | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/mural/posts/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: MuralPost) => setPost(data))
      .catch(() => setError("No se pudo cargar la publicación."))
      .finally(() => setIsLoaded(true));
  }, [id]);

  async function handleSubmit(data: MuralPostFormData) {
    setError(null);
    setIsSubmitting(true);
    const result = await submitPost(`/api/mural/posts/${id}`, "PATCH", data);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`${basePath}/posts/${id}`);
  }

  return (
    <ResourceNewPage
      title="Editar publicación"
      description={post?.title ?? "Publicación del mural"}
      backHref={`${basePath}/posts/${id}`}
      backLabel="Volver a la publicación"
      error={error}
    >
      {!isLoaded ? (
        <FormSkeleton fields={4} />
      ) : post ? (
        <MuralPostForm
          initialValues={post}
          submitLabel="Guardar cambios"
          cancelHref={`${basePath}/posts/${id}`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </ResourceNewPage>
  );
}
