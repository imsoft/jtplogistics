"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { SecretInput } from "@/components/ui/secret-input";
import { AppSelect } from "@/components/ui/app-select";
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
  const [password, setPassword] = useState("");
  // Solo se manda la contraseña si se reveló o se escribió; si se deja
  // intacta, se omite del payload para no borrar la que ya estaba.
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initialValues.assignees?.map((a) => a.id) ?? []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ type, email, password: passwordTouched ? password : undefined, assigneeIds });
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
          <AppSelect
            value={type}
            onValueChange={setType}
            options={EMAIL_ACCOUNT_TYPES}
            className="w-full"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="em-password">Contraseña</Label>
          <SecretInput
            id="em-password"
            type="email"
            resourceId={initialValues.id}
            hasPassword={initialValues.hasPassword}
            value={password}
            onChange={(v) => { setPasswordTouched(true); setPassword(v); }}
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
