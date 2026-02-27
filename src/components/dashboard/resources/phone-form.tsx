"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EmployeeSelect } from "./employee-select";
import { EmailAccountSelect } from "./email-account-select";
import type { PhoneDevice, PhoneFormData } from "@/types/resources.types";

interface PhoneFormProps {
  initialValues?: Partial<PhoneDevice>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PhoneFormData) => void;
  isSubmitting?: boolean;
}

export function PhoneForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: PhoneFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialValues.phoneNumber ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [imei, setImei] = useState(initialValues.imei ?? "");
  const [assignedToId, setAssignedToId] = useState(initialValues.assignedToId ?? "");
  const [emailAccountId, setEmailAccountId] = useState(initialValues.emailAccountId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, phoneNumber, password, imei, assignedToId, emailAccountId });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ph-name">Nombre / Identificador</Label>
          <Input
            id="ph-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-number">Número telefónico</Label>
          <Input
            id="ph-number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-password">Contraseña / PIN</Label>
          <PasswordInput
            id="ph-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-imei">IMEI</Label>
          <Input
            id="ph-imei"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
          />
        </div>
        <EmployeeSelect
          label="Asignado a"
          value={assignedToId}
          onValueChange={setAssignedToId}
        />
        <EmailAccountSelect
          label="Correo vinculado"
          value={emailAccountId}
          onValueChange={setEmailAccountId}
        />
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
