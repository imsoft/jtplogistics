"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPARTMENTS = ["Logistica", "Finanzas", "Admin", "TI"] as const;
import type { Employee, EmployeeFormData } from "@/types/resources.types";

interface EmployeeFormProps {
  initialValues?: Partial<Employee>;
  submitLabel: string;
  cancelHref: string;
  isNew?: boolean;
  onSubmit: (data: EmployeeFormData) => void;
  isSubmitting?: boolean;
}

export function EmployeeForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  isNew = false,
  onSubmit,
  isSubmitting = false,
}: EmployeeFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [birthDate, setBirthDate] = useState(initialValues.birthDate ?? "");
  const [position, setPosition] = useState(initialValues.position ?? "");
  const [department, setDepartment] = useState(initialValues.department ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, email, password, birthDate, position, department, phone });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emp-name">Nombre completo</Label>
          <Input
            id="emp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-email">Correo electrónico</Label>
          <Input
            id="emp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!isNew}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-password">{isNew ? "Contraseña" : "Contraseña (referencia)"}</Label>
          <PasswordInput
            id="emp-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={isNew}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-birthDate">Fecha de nacimiento</Label>
          <Input
            id="emp-birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-phone">Teléfono</Label>
          <Input
            id="emp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-position">Puesto</Label>
          <Input
            id="emp-position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-department">Departamento</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger id="emp-department">
              <SelectValue placeholder="Selecciona un departamento" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
