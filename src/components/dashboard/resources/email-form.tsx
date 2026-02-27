"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeMultiSelect } from "./employee-multiselect";
import { EMAIL_ACCOUNT_TYPES } from "@/lib/constants/email-type";
import type { EmailAccount, EmailFormData } from "@/types/resources.types";

interface EmailFormProps {
  initialValues?: Partial<EmailAccount>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: EmailFormData) => void;
  isSubmitting?: boolean;
}

export function EmailForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: EmailFormProps) {
  const [type, setType] = useState(initialValues.type ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initialValues.assignees?.map((a) => a.id) ?? []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ type, email, password, assigneeIds });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="em-email">Correo electrónico</Label>
          <Input
            id="em-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de cuenta</Label>
          <Select value={type} onValueChange={setType} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="em-password">Contraseña</Label>
          <PasswordInput
            id="em-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <EmployeeMultiSelect
            label="Asignados"
            value={assigneeIds}
            onChange={setAssigneeIds}
          />
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
