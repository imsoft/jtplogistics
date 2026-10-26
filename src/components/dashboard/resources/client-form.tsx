"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { CFDI_USES, TAX_REGIMES } from "@/lib/sat-catalogs";
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
  const [taxRegime, setTaxRegime] = useState(initialValues.taxRegime ?? "");
  const [fiscalZip, setFiscalZip] = useState(initialValues.fiscalZip ?? "");
  const [cfdiUse, setCfdiUse] = useState(initialValues.cfdiUse ?? "G03");
  const [creditDays, setCreditDays] = useState(initialValues.creditDays != null ? String(initialValues.creditDays) : "");
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
      taxRegime,
      fiscalZip,
      cfdiUse,
      creditDays,
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
          <Label htmlFor="client-name">Razón social</Label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
        <div className="space-y-3 rounded-lg border p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold">Datos para facturar</p>
            <p className="text-muted-foreground text-xs">
              Tal como vienen en la constancia de situación fiscal del cliente. Sin ellos no se le puede timbrar factura (CFDI 4.0).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Régimen fiscal</Label>
              <AppSelect value={taxRegime} onValueChange={setTaxRegime} options={TAX_REGIMES} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-fiscalZip">Código postal fiscal</Label>
              <Input
                id="client-fiscalZip"
                inputMode="numeric"
                maxLength={5}
                value={fiscalZip}
                onChange={(e) => setFiscalZip(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>Uso del CFDI</Label>
              <AppSelect value={cfdiUse} onValueChange={setCfdiUse} options={CFDI_USES} className="w-full" />
              <p className="text-muted-foreground text-xs">El que pide el cliente. Para fletes casi siempre es G03, gastos en general.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-creditDays">Días de crédito</Label>
              <Input
                id="client-creditDays"
                inputMode="numeric"
                maxLength={3}
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-muted-foreground text-xs">Con ellos se calcula cuándo vence cada factura. Vacío: 30 días.</p>
            </div>
          </div>
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
