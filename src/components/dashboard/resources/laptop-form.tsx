"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { AppSelect } from "@/components/ui/app-select";
import { EmployeeSelect } from "./employee-select";
import { EmailAccountSelect } from "./email-account-select";
import { DeviceImageUpload } from "./device-image-upload";
import type { Laptop, LaptopFormData } from "@/types/resources.types";

interface LaptopFormProps {
  initialValues?: Partial<Laptop>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: LaptopFormData) => void;
  isSubmitting?: boolean;
  scope?: "admin" | "collaborator";
}

export function LaptopForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  scope = "admin",
}: LaptopFormProps) {
  const employeeEndpoint = scope === "collaborator" ? "/api/collaborator/employees" : "/api/admin/employees";
  const emailEndpoint = scope === "collaborator" ? "/api/collaborator/emails" : "/api/admin/emails";
  const uploadEndpoint = scope === "collaborator" ? "/api/collaborator/uploads" : "/api/admin/uploads";
  const [name, setName] = useState(initialValues.name ?? "");
  const [equipmentCode, setEquipmentCode] = useState(initialValues.equipmentCode ?? "");
  const [password, setPassword] = useState(initialValues.password ?? "");
  const [serialNumber, setSerialNumber] = useState(initialValues.serialNumber ?? "");
  const [brand, setBrand] = useState(initialValues.brand ?? "");
  const [model, setModel] = useState(initialValues.model ?? "");
  const [color, setColor] = useState(initialValues.color ?? "");
  const [accessories, setAccessories] = useState(initialValues.accessories ?? "");
  const [generalState, setGeneralState] = useState(initialValues.generalState ?? "");
  const [software, setSoftware] = useState(initialValues.software ?? "");
  const [observations, setObservations] = useState(initialValues.observations ?? "");
  const [maintenanceProvider, setMaintenanceProvider] = useState(initialValues.maintenanceProvider ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues.imageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(initialValues.imagePublicId ?? "");
  const [assignedToId, setAssignedToId] = useState(initialValues.assignedToId ?? "");
  const [emailAccountId, setEmailAccountId] = useState(initialValues.emailAccountId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, equipmentCode, password, serialNumber, equipmentType: "", brand, model, color, accessories, generalState, software, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId });
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
          <Label htmlFor="lap-code">Código del equipo</Label>
          <Input
            id="lap-code"
            value={equipmentCode}
            onChange={(e) => setEquipmentCode(e.target.value)}
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
          <Label htmlFor="lap-color">Color</Label>
          <Input
            id="lap-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
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
          <AppSelect
            value={generalState}
            onValueChange={setGeneralState}
            options={[{value: "Bueno", label: "Bueno"}, {value: "Regular", label: "Regular"}, {value: "Malo", label: "Malo"}]}
            className="w-full"
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
          <Label htmlFor="lap-maintenance">Proveedor de mantenimiento</Label>
          <Input
            id="lap-maintenance"
            value={maintenanceProvider}
            onChange={(e) => setMaintenanceProvider(e.target.value)}
          />
        </div>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lap-observations">Observaciones</Label>
          <Textarea
            id="lap-observations"
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
            folder="Devices/Laptops"
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
