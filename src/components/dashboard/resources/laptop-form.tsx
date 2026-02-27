"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EmployeeSelect } from "./employee-select";
import { EmailAccountSelect } from "./email-account-select";
import type { Laptop, LaptopFormData } from "@/types/resources.types";

interface LaptopFormProps {
  initialValues?: Partial<Laptop>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: LaptopFormData) => void;
  isSubmitting?: boolean;
}

export function LaptopForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: LaptopFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [serialNumber, setSerialNumber] = useState(initialValues.serialNumber ?? "");
  const [assignedToId, setAssignedToId] = useState(initialValues.assignedToId ?? "");
  const [emailAccountId, setEmailAccountId] = useState(initialValues.emailAccountId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, password, serialNumber, assignedToId, emailAccountId });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lap-name">Nombre / Identificador</Label>
          <Input
            id="lap-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lap-serial">No. de serie</Label>
          <Input
            id="lap-serial"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lap-password">Contraseña</Label>
          <PasswordInput
            id="lap-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
