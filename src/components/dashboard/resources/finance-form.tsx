"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
import { formatMxnLive } from "@/lib/utils";
import { getIncidentSelectOptions } from "@/lib/incident-yes-no";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import type { Finance, FinanceFormData } from "@/types/finance.types";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toMxnInput(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

interface FinanceFormProps {
  initialValues?: Partial<Finance>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: FinanceFormData) => void;
  isSubmitting?: boolean;
}

export function FinanceForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: FinanceFormProps) {
  const [eco, setEco] = useState(initialValues.eco ?? "");
  const [client, setClient] = useState(initialValues.client ?? "");
  const [origin, setOrigin] = useState(initialValues.origin ?? "");
  const [destination, setDestination] = useState(initialValues.destination ?? "");
  const [sale, setSale] = useState(toMxnInput(initialValues.sale));
  const [product, setProduct] = useState(initialValues.product ?? "");
  const [pickupDate, setPickupDate] = useState(toDateInput(initialValues.pickupDate));
  const [deliveryDate, setDeliveryDate] = useState(toDateInput(initialValues.deliveryDate));
  const [legalName, setLegalName] = useState(initialValues.legalName ?? "");
  const [cost, setCost] = useState(toMxnInput(initialValues.cost));
  const [operatorName, setOperatorName] = useState(initialValues.operatorName ?? "");
  const [truck, setTruck] = useState(initialValues.truck ?? "");
  const [trailer, setTrailer] = useState(initialValues.trailer ?? "");
  const [unit, setUnit] = useState(initialValues.unit ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [comments, setComments] = useState(initialValues.comments ?? "");
  const [incident, setIncident] = useState(initialValues.incident ?? "");
  const [incidentType, setIncidentType] = useState(initialValues.incidentType ?? "");

  const incidentSelectOptions = useMemo(() => getIncidentSelectOptions(incident), [incident]);
  const incidentTypes = useIncidentTypes();

  const incidentTypeOptions = useMemo(() => {
    const t = incidentType.trim();
    const values = incidentTypes.map((x) => x.value);
    if (t && !values.includes(t)) {
      return [{ value: t, label: t }, ...incidentTypes];
    }
    return incidentTypes;
  }, [incidentTypes, incidentType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      eco, client, origin, destination, sale, product,
      pickupDate, deliveryDate, legalName, cost, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="finance-eco">ECO</Label>
          <Input id="finance-eco" value={eco} onChange={(e) => setEco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-client">Cliente</Label>
          <Input id="finance-client" value={client} onChange={(e) => setClient(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-legalName">Razón social</Label>
          <Input id="finance-legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-origin">Origen</Label>
          <Input id="finance-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-destination">Destino</Label>
          <Input id="finance-destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-product">Producto</Label>
          <Input id="finance-product" value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-sale" className="leading-snug">
            {FINANCE_TARIFF_SALE_LABEL}
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm shrink-0">$</span>
            <Input
              id="finance-sale"
              type="text"
              inputMode="decimal"
              value={sale}
              onChange={(e) => setSale(formatMxnLive(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-cost" className="leading-snug">
            {FINANCE_TARIFF_COST_LABEL}
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm shrink-0">$</span>
            <Input
              id="finance-cost"
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(formatMxnLive(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-pickupDate">Recolección</Label>
          <Input id="finance-pickupDate" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-deliveryDate">Entrega</Label>
          <Input id="finance-deliveryDate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-operatorName">Nombre operador</Label>
          <Input id="finance-operatorName" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-truck">Tracto</Label>
          <Input id="finance-truck" value={truck} onChange={(e) => setTruck(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-trailer">Caja</Label>
          <Input id="finance-trailer" value={trailer} onChange={(e) => setTrailer(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-unit">Unidad</Label>
          <Input id="finance-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-phone">Celular</Label>
          <Input id="finance-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-incident">Incidencia</Label>
          <Select value={incident || undefined} onValueChange={setIncident}>
            <SelectTrigger id="finance-incident">
              <SelectValue placeholder="Selecciona Sí o No" />
            </SelectTrigger>
            <SelectContent>
              {incidentSelectOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-incidentType">Tipo de incidencia</Label>
          <Select value={incidentType || undefined} onValueChange={setIncidentType}>
            <SelectTrigger id="finance-incidentType">
              <SelectValue
                placeholder={
                  incidentTypeOptions.length === 0
                    ? "No hay tipos de incidencia"
                    : "Selecciona tipo de incidencia"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {incidentTypeOptions.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="finance-comments">Comentarios</Label>
        <Textarea id="finance-comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
