"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormActions } from "@/components/ui/form-actions";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { LexicalEditor } from "@/components/ui/lexical-editor";
import type { MuralPost, MuralPostFormData } from "@/types/mural.types";

interface MuralPostFormProps {
  initialValues?: Partial<MuralPost>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: MuralPostFormData) => void;
  isSubmitting?: boolean;
}

export function MuralPostForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: MuralPostFormProps) {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [excerpt, setExcerpt] = useState(initialValues.excerpt ?? "");
  const [contentJson, setContentJson] = useState(initialValues.contentJson ?? "");
  const [coverUrl, setCoverUrl] = useState(initialValues.coverUrl ?? "");
  const [coverPublicId, setCoverPublicId] = useState(initialValues.coverPublicId ?? "");
  const [published, setPublished] = useState(initialValues.published ?? true);
  const [notifyByEmail, setNotifyByEmail] = useState(true);

  const wasPublished = initialValues.published === true;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      excerpt,
      contentJson,
      coverUrl,
      coverPublicId,
      published,
      notifyByEmail,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Resumen</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Una o dos líneas que se muestran en el mural y en el correo."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Portada</Label>
          <CoverImageUpload
            currentImage={coverUrl || null}
            endpoint="/api/mural/uploads"
            onSuccess={(url, publicId) => {
              setCoverUrl(url);
              setCoverPublicId(publicId ?? "");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Contenido</Label>
          <LexicalEditor value={contentJson} onChange={setContentJson} minHeight={280} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="published">Publicar</Label>
            <p className="text-xs text-muted-foreground">
              Si lo dejas apagado se guarda como borrador y solo lo ve quien administra el mural.
            </p>
          </div>
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
        </div>

        {published && !wasPublished && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="notify">Notificar por correo</Label>
              <p className="text-xs text-muted-foreground">
                Manda un correo a los colaboradores además de la notificación del dashboard.
              </p>
            </div>
            <Switch id="notify" checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
          </div>
        )}
      </div>

      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
