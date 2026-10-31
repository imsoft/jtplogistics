"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { ClipboardList, Smartphone, UserRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SecretInput } from "@/components/ui/secret-input";
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
  // El directorio mínimo: basta el permiso del equipo, no el de Colaboradores.
  const employeeEndpoint = scope === "collaborator" ? "/api/collaborator/people" : "/api/admin/employees";
  const emailEndpoint = scope === "collaborator" ? "/api/collaborator/emails" : "/api/admin/emails";
  const uploadEndpoint = scope === "collaborator" ? "/api/collaborator/uploads" : "/api/admin/uploads";
  const [name, setName] = useState(initialValues.name ?? "");
  const [equipmentCode, setEquipmentCode] = useState(initialValues.equipmentCode ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialValues.phoneNumber ?? "");
  const [password, setPassword] = useState("");
  // Solo se manda la contraseña si se reveló o se escribió; si se deja
  // intacta, se omite del payload para no borrar la que ya estaba.
  const [passwordTouched, setPasswordTouched] = useState(false);
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
    onSubmit({ name, equipmentCode, phoneNumber, password: passwordTouched ? password : undefined, imei: normalizedImei, serialNumber, brand, model, color, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={Smartphone} title="Equipo" description="Qué celular es y su línea." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ph-name">
            <RequiredText>Nombre / Identificador</RequiredText>
          </Label>
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
      </FormSection>

      <FormSection icon={UserRound} title="Acceso y asignación" description="Su PIN y quién lo usa." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ph-password">Contraseña / PIN</Label>
          <SecretInput
            id="ph-password"
            type="phone"
            resourceId={initialValues.id}
            hasPassword={initialValues.hasPassword}
            value={password}
            onChange={(v) => { setPasswordTouched(true); setPassword(v); }}
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
      </FormSection>

      <FormSection icon={ClipboardList} title="Observaciones y foto" description="Lo que hay que saber del equipo." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ph-observations">Observaciones</Label>
          <Textarea
            id="ph-observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
          />
          <p className="text-muted-foreground text-xs">Recomendaciones del proveedor, garantías, etc.</p>
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
      </FormSection>

      <FormActions sticky submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
