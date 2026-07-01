"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EmployeeSelect } from "./employee-select";
import { EmailAccountSelect } from "./email-account-select";
import { DeviceImageUpload } from "./device-image-upload";
import type { PhoneDevice, PhoneFormData } from "@/types/resources.types";
import { formatIMEI } from "@/lib/utils";

interface PhoneFormProps {
  initialValues?: Partial<PhoneDevice>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PhoneFormData) => void;
  isSubmitting?: boolean;
  scope?: "admin" | "collaborator";
}

export function PhoneForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  scope = "admin",
}: PhoneFormProps) {
  const employeeEndpoint = scope === "collaborator" ? "/api/collaborator/employees" : "/api/admin/employees";
  const emailEndpoint = scope === "collaborator" ? "/api/collaborator/emails" : "/api/admin/emails";
  const uploadEndpoint = scope === "collaborator" ? "/api/collaborator/uploads" : "/api/admin/uploads";
  const [name, setName] = useState(initialValues.name ?? "");
  const [equipmentCode, setEquipmentCode] = useState(initialValues.equipmentCode ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialValues.phoneNumber ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [imei, setImei] = useState(formatIMEI(initialValues.imei ?? ""));
  const [serialNumber, setSerialNumber] = useState(initialValues.serialNumber ?? "");
  const [brand, setBrand] = useState(initialValues.brand ?? "");
  const [model, setModel] = useState(initialValues.model ?? "");
  const [color, setColor] = useState(initialValues.color ?? "");
  const [observations, setObservations] = useState(initialValues.observations ?? "");
  const [maintenanceProvider, setMaintenanceProvider] = useState(initialValues.maintenanceProvider ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues.imageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(initialValues.imagePublicId ?? "");
  const [assignedToId, setAssignedToId] = useState(initialValues.assignedToId ?? "");
  const [emailAccountId, setEmailAccountId] = useState(initialValues.emailAccountId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedImei = imei.replace(/\s/g, "");
    onSubmit({ name, equipmentCode, phoneNumber, password, imei: normalizedImei, serialNumber, brand, model, color, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId });
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
          <Label htmlFor="ph-code">Código del equipo</Label>
          <Input
            id="ph-code"
            value={equipmentCode}
            onChange={(e) => setEquipmentCode(e.target.value)}
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
            onChange={(e) => setImei(formatIMEI(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-serial">No. de serie</Label>
          <Input
            id="ph-serial"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-brand">Marca</Label>
          <Input
            id="ph-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-model">Modelo</Label>
          <Input
            id="ph-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-color">Color</Label>
          <Input
            id="ph-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <EmployeeSelect
          label="Asignado a"
          value={assignedToId}
          onValueChange={setAssignedToId}
          endpoint={employeeEndpoint}
        />
        <EmailAccountSelect
          label="Correo vinculado"
          value={emailAccountId}
          onValueChange={setEmailAccountId}
          endpoint={emailEndpoint}
        />
        <div className="space-y-2">
          <Label htmlFor="ph-maintenance">Proveedor de mantenimiento</Label>
          <Input
            id="ph-maintenance"
            value={maintenanceProvider}
            onChange={(e) => setMaintenanceProvider(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ph-observations">Observaciones</Label>
          <Textarea
            id="ph-observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            placeholder="Recomendaciones del proveedor, garantías, etc."
          />
        </div>
        <div className="sm:col-span-2">
          <DeviceImageUpload
            imageUrl={imageUrl}
            endpoint={uploadEndpoint}
            folder="Devices/Phones"
            onChange={(url, publicId) => {
              setImageUrl(url);
              setImagePublicId(publicId);
            }}
          />
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
