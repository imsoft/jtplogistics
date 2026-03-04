"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { Vendor, VendorFormData } from "@/types/resources.types";

interface VendorFormProps {
  initialValues?: Partial<Vendor>;
  submitLabel: string;
  cancelHref: string;
  isNew?: boolean;
  onSubmit: (data: VendorFormData) => void;
  isSubmitting?: boolean;
}

export function VendorForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  isNew = false,
  onSubmit,
  isSubmitting = false,
}: VendorFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState(initialValues.birthDate ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, email, password, birthDate });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-name">Nombre completo</Label>
          <Input
            id="v-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-email">Correo electrónico</Label>
          <Input
            id="v-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!isNew}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-password">{isNew ? "Contraseña" : "Nueva contraseña (opcional)"}</Label>
          <PasswordInput
            id="v-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={isNew}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-birthDate">Fecha de nacimiento</Label>
          <Input
            id="v-birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
