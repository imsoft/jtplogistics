"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { FormActions } from "@/components/ui/form-actions";
import { IDEA_CATEGORIES } from "@/lib/constants/idea-category";
import type { Idea } from "@/types/idea.types";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { Lightbulb } from "lucide-react";

interface IdeaFormProps {
  initialValues?: Partial<Idea>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: { title: string; description: string; category: string }) => void;
  isSubmitting?: boolean;
}

export function IdeaForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: IdeaFormProps) {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [category, setCategory] = useState(initialValues.category || "none");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description, category: category === "none" ? "" : category });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={Lightbulb} title="Idea" description="Qué propones y de qué tema es." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">
            <RequiredText>Título</RequiredText>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Categoría</Label>
          <AppSelect
            value={category}
            onValueChange={setCategory}
            options={[{value: "none", label: "Sin categoría"}, ...IDEA_CATEGORIES.map((cat) => ({value: cat, label: cat}))]}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>
      </FormSection>

      <FormActions
        sticky
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}
