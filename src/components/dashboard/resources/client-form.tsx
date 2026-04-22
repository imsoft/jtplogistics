"use client";

import { useState, useEffect } from "react";
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
  children?: React.ReactNode;
}

export function ClientForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  children,
}: ClientFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [contactName, setContactName] = useState(initialValues.contactName ?? "");
  const [position, setPosition] = useState(initialValues.position ?? "");
  const [legalName, setLegalName] = useState(initialValues.legalName ?? "");
  const [rfc, setRfc] = useState(initialValues.rfc ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [address, setAddress] = useState(initialValues.address ?? "");
  const [notes, setNotes] = useState(initialValues.notes ?? "");
  const [detentionConditions, setDetentionConditions] = useState(initialValues.detentionConditions ?? "");
  const [productTypesInput, setProductTypesInput] = useState(
    (initialValues.productTypes ?? []).join(", ")
  );

  useEffect(() => {
    setProductTypesInput((initialValues.productTypes ?? []).join(", "));
  }, [initialValues.productTypes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const productTypes = [
      ...new Set(
        productTypesInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    ];
    onSubmit({
      name,
      contactName,
      position,
      legalName,
      rfc,
      email,
      phone,
      address,
      notes,
      detentionConditions,
      productTypes,
    });
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
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-legalName">Razón social</Label>
          <Input
            id="client-legalName"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-contactName">Nombre de contacto</Label>
          <Input
            id="client-contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-position">Puesto</Label>
          <Input
            id="client-position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-rfc">RFC</Label>
          <Input
            id="client-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-email">Correo electrónico</Label>
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-phone">Teléfono</Label>
          <Input
            id="client-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-address">Dirección</Label>
          <Input
            id="client-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-product-types">Tipos de producto que maneja</Label>
          <Input
            id="client-product-types"
            value={productTypesInput}
            onChange={(e) => setProductTypesInput(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-detentionConditions">Condiciones de estadías</Label>
          <Textarea
            id="client-detentionConditions"
            value={detentionConditions}
            onChange={(e) => setDetentionConditions(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-notes">Notas</Label>
          <Textarea
            id="client-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      {children}
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
