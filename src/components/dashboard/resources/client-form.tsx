"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import type { Client, ClientFormData } from "@/types/client.types";

interface ClientFormProps {
  initialValues?: Partial<Client>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: ClientFormData) => void;
  isSubmitting?: boolean;
}

export function ClientForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: ClientFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [legalName, setLegalName] = useState(initialValues.legalName ?? "");
  const [rfc, setRfc] = useState(initialValues.rfc ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [address, setAddress] = useState(initialValues.address ?? "");
  const [notes, setNotes] = useState(initialValues.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, legalName, rfc, email, phone, address, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-name">Nombre comercial</Label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Empresa ABC"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-legalName">Razón social</Label>
          <Input
            id="client-legalName"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Ej: Empresa ABC, S.A. de C.V."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-rfc">RFC</Label>
          <Input
            id="client-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            placeholder="Ej: EAB123456ABC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-email">Correo electrónico</Label>
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@empresa.com"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-phone">Teléfono</Label>
          <Input
            id="client-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 55 1234 5678"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-address">Dirección</Label>
          <Input
            id="client-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, número, colonia, ciudad, estado"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-notes">Notas</Label>
          <Textarea
            id="client-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información adicional del cliente"
            rows={3}
          />
        </div>
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
