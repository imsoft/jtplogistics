"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [brand, setBrand] = useState(initialValues.brand ?? "");
  const [model, setModel] = useState(initialValues.model ?? "");
  const [accessories, setAccessories] = useState(initialValues.accessories ?? "");
  const [generalState, setGeneralState] = useState(initialValues.generalState ?? "");
  const [software, setSoftware] = useState(initialValues.software ?? "");
  const [assignedToId, setAssignedToId] = useState(initialValues.assignedToId ?? "");
  const [emailAccountId, setEmailAccountId] = useState(initialValues.emailAccountId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, password, serialNumber, equipmentType: "", brand, model, accessories, generalState, software, assignedToId, emailAccountId });
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
          <Label htmlFor="lap-brand">Marca</Label>
          <Input
            id="lap-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lap-model">Modelo</Label>
          <Input
            id="lap-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
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
        <div className="space-y-2">
          <Label htmlFor="lap-general-state">Estado general</Label>
          <Select value={generalState} onValueChange={setGeneralState}>
            <SelectTrigger id="lap-general-state" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bueno">Bueno</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Malo">Malo</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lap-accessories">Accesorios</Label>
          <Textarea
            id="lap-accessories"
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lap-software">Software</Label>
          <Textarea
            id="lap-software"
            value={software}
            onChange={(e) => setSoftware(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
