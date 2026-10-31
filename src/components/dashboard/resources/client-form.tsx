"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { FormSection } from "@/components/ui/form-section";
import { Building2, Package, ReceiptText, UserRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { ProductTagsField } from "@/components/dashboard/resources/product-tags-field";
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
  const legalName = initialValues.legalName ?? "";
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
  const [productTypes, setProductTypes] = useState<string[]>(initialValues.productTypes ?? []);

  // Si cambian los productos iniciales, se reinicia el campo.
  const [prevProductTypes, setPrevProductTypes] = useState(initialValues.productTypes);
  if (initialValues.productTypes !== prevProductTypes) {
    setPrevProductTypes(initialValues.productTypes);
    setProductTypes(initialValues.productTypes ?? []);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      // Sin filas vacías ni repetidos (sin distinguir mayúsculas).
      productTypes: productTypes.map((x) => x.trim()).filter((x, i, a) => x && a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={Building2} title="Empresa" description="Cómo se llama el cliente y dónde está." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-name">
            <span>
              Razón social<span className="text-destructive" aria-hidden>*</span>
            </span>
          </Label>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-address">Dirección</Label>
          <Input
            id="client-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection
        icon={ReceiptText}
        title="Datos para facturar"
        description="Tal como vienen en la constancia de situación fiscal del cliente. Sin ellos no se le puede timbrar factura (CFDI 4.0)."
        className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3"
      >
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
        <div className="space-y-2 sm:col-span-2">
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
      </FormSection>

      <FormSection icon={UserRound} title="Contacto" description="Con quién se habla en el cliente." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
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
        <div className="space-y-2">
          <Label htmlFor="client-phone">Teléfono</Label>
          <Input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection icon={Package} title="Operación" description="Qué mueve el cliente y cómo se le trabaja." className="space-y-5">
        <ProductTagsField id="client-product-types" value={productTypes} onChange={setProductTypes} />
        <div className="space-y-2">
          <Label htmlFor="client-detentionConditions">Condiciones de estadías</Label>
          <Textarea
            id="client-detentionConditions"
            value={detentionConditions}
            onChange={(e) => setDetentionConditions(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-notes">Notas</Label>
          <Textarea
            id="client-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </FormSection>

      {children}
      <FormActions sticky submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
