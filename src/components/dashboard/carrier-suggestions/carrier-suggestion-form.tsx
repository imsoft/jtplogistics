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
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { MessageSquarePlus } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={MessageSquarePlus} title="Sugerencia" description="Cuéntanos qué mejorarías." className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cs-title">
          <RequiredText>Título</RequiredText>
        </Label>
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
      </FormSection>
      <FormActions sticky submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
