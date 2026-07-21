"use client";

import { useEffect, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  image: string | null;
}

interface Comment {
  id: string;
  comment: string;
  createdAt: string;
  user: User;
}

interface QuoteCommentsProps {
  quoteId: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function QuoteComments({ quoteId }: QuoteCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/generated-quotes/${quoteId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch (e) {
      console.error("Error al cargar comentarios:", e);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleAddComment() {
    if (!newComment.trim()) {
      toast.error("El comentario no puede estar vacío");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/generated-quotes/${quoteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No se pudo agregar el comentario");
      }

      const comment = await res.json();
      setComments([...comments, comment]);
      setNewComment("");
      toast.success("Comentario agregado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo agregar el comentario");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando comentarios…</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Seguimiento de la cotización
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agregar comentario */}
        <div className="space-y-2">
          <Textarea
            placeholder="Agregar un comentario para el seguimiento…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={isSubmitting || !newComment.trim()}
            >
              <Send className="size-4 mr-2" />
              {isSubmitting ? "Guardando…" : "Comentar"}
            </Button>
          </div>
        </div>

        {/* Lista de comentarios */}
        <div className="space-y-3 border-t pt-4">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No hay comentarios aún. Sé el primero en agregar uno.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {comment.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.user.image}
                      alt={comment.user.name}
                      className="size-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(comment.user.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{comment.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words pl-8">
                  {comment.comment}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
