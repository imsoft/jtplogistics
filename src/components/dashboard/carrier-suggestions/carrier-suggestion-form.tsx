"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import type {
  CarrierSuggestion,
  CarrierSuggestionFormData,
} from "@/types/carrier-suggestion.types";

interface CarrierSuggestionFormProps {
  initialValues?: Partial<CarrierSuggestion>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: CarrierSuggestionFormData) => void;
  isSubmitting?: boolean;
}

export function CarrierSuggestionForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: CarrierSuggestionFormProps) {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="cs-title">Título *</Label>
        <Input
          id="cs-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cs-description">Descripción</Label>
        <Textarea
          id="cs-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
        />
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
