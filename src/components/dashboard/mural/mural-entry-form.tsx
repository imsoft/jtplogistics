"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/ui/app-select";
import { FormActions } from "@/components/ui/form-actions";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { MURAL_ENTRY_TYPES, MURAL_KIND_LABELS } from "@/lib/constants/mural";
import type { MuralEntry, MuralEntryFormData } from "@/types/mural.types";

interface MuralPerson {
  id: string;
  name: string;
}

interface MuralEntryFormProps {
  initialValues?: Partial<MuralEntry>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: MuralEntryFormData) => void;
  isSubmitting?: boolean;
  /** En edición no se vuelve a notificar, así que se oculta el interruptor. */
  showNotifyToggle?: boolean;
}

/** ISO -> "YYYY-MM-DD" en UTC, que es como se guardan las fechas del mural. */
function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function MuralEntryForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  showNotifyToggle = true,
}: MuralEntryFormProps) {
  const [type, setType] = useState(initialValues.type ?? "event");
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [location, setLocation] = useState(initialValues.location ?? "");
  const [startDate, setStartDate] = useState(toDateInput(initialValues.startDate));
  const [endDate, setEndDate] = useState(toDateInput(initialValues.endDate));
  const [imageUrl, setImageUrl] = useState(initialValues.imageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(initialValues.imagePublicId ?? "");
  const [subjectUserId, setSubjectUserId] = useState(initialValues.subjectUserId ?? "none");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [people, setPeople] = useState<MuralPerson[]>([]);

  useEffect(() => {
    fetch("/api/mural/people")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MuralPerson[]) => setPeople(data))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      type,
      title,
      description,
      location,
      startDate,
      endDate,
      imageUrl,
      imagePublicId,
      subjectUserId: subjectUserId === "none" ? "" : subjectUserId,
      notifyByEmail,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo *</Label>
          <AppSelect
            value={type}
            onValueChange={(v) => setType(v as typeof type)}
            options={MURAL_ENTRY_TYPES.map((t) => ({ value: t, label: MURAL_KIND_LABELS[t] }))}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="startDate">Fecha de inicio *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="endDate">Fecha de fin</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Lugar</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Oficina CDMX, en línea…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Colaborador</Label>
          <AppSelect
            value={subjectUserId}
            onValueChange={setSubjectUserId}
            options={[
              { value: "none", label: "Sin colaborador" },
              ...people.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Imagen</Label>
          <CoverImageUpload
            currentImage={imageUrl || null}
            endpoint="/api/mural/uploads"
            onSuccess={(url, publicId) => {
              setImageUrl(url);
              setImagePublicId(publicId ?? "");
            }}
          />
        </div>
      </div>

      {showNotifyToggle && (
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

      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
