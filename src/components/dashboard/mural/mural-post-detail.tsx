"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { LexicalContent } from "@/components/dashboard/mural/lexical-content";
import type { MuralPermissions, MuralPost } from "@/types/mural.types";

interface MuralPostDetailProps {
  id: string;
  basePath: string;
}

export function MuralPostDetail({ id, basePath }: MuralPostDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<MuralPost | null>(null);
  const [permissions, setPermissions] = useState<MuralPermissions | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/mural/posts/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: MuralPost) => setPost(data))
      .catch(() => setError("No se pudo cargar la publicación."))
      .finally(() => setIsLoaded(true));

    fetch("/api/mural/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then(setPermissions)
      .catch(() => {});
  }, [id]);

  async function handleDelete() {
    const res = await fetch(`/api/mural/posts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo eliminar la publicación.");
      return;
    }
    router.push(basePath);
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-[3/1] w-full rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {error ?? "Publicación no encontrada."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={basePath}>Volver al mural</Link>
        </Button>
      </div>
    );
  }

  const date = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(post.publishedAt ?? post.createdAt));

  return (
    <article className="min-w-0 space-y-6">
      <div className="flex items-start gap-1.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-foreground">
          <Link href={basePath} aria-label="Volver al mural">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-heading">{post.title}</h1>
            {!post.published && <Badge variant="outline">Borrador</Badge>}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            {post.authorName} · {date}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {permissions?.canUpdate && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/posts/${post.id}/edit`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
          )}
          {permissions?.canDelete && (
            <DeleteConfirmDialog
              title="Eliminar publicación"
              description={`Se eliminará "${post.title}" del mural.`}
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>

      <Separator />

      {post.coverUrl && (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg bg-muted">
          <Image src={post.coverUrl} alt="" fill className="object-cover" />
        </div>
      )}

      {post.excerpt && <p className="text-base text-muted-foreground">{post.excerpt}</p>}

      <LexicalContent json={post.contentJson} className="text-sm sm:text-base" />
    </article>
  );
}
