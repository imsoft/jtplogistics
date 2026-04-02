"use client";

import { useState } from "react";
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
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import type { Shipment, ShipmentFormData, ShipmentStatus } from "@/types/shipment.types";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: "pending", label: SHIPMENT_STATUS_CONFIG.pending.label },
  { value: "delivered", label: SHIPMENT_STATUS_CONFIG.delivered.label },
  { value: "delivered_with_delay", label: SHIPMENT_STATUS_CONFIG.delivered_with_delay.label },
  { value: "not_delivered", label: SHIPMENT_STATUS_CONFIG.not_delivered.label },
  { value: "at_risk", label: SHIPMENT_STATUS_CONFIG.at_risk.label },
  { value: "returned", label: SHIPMENT_STATUS_CONFIG.returned.label },
];

interface ShipmentFormProps {
  initialValues?: Partial<Shipment>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: ShipmentFormData) => void;
  isSubmitting?: boolean;
}

export function ShipmentForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: ShipmentFormProps) {
  const [eco, setEco] = useState(initialValues.eco ?? "");
  const [client, setClient] = useState(initialValues.client ?? "");
  const [origin, setOrigin] = useState(initialValues.origin ?? "");
  const [destination, setDestination] = useState(initialValues.destination ?? "");
  const [product, setProduct] = useState(initialValues.product ?? "");
  const [pickupDate, setPickupDate] = useState(toDateInput(initialValues.pickupDate));
  const [deliveryDate, setDeliveryDate] = useState(toDateInput(initialValues.deliveryDate));
  const [legalName, setLegalName] = useState(initialValues.legalName ?? "");
  const [operatorName, setOperatorName] = useState(initialValues.operatorName ?? "");
  const [truck, setTruck] = useState(initialValues.truck ?? "");
  const [trailer, setTrailer] = useState(initialValues.trailer ?? "");
  const [unit, setUnit] = useState(initialValues.unit ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [comments, setComments] = useState(initialValues.comments ?? "");
  const [incident, setIncident] = useState(initialValues.incident ?? "");
  const [incidentType, setIncidentType] = useState(initialValues.incidentType ?? "");
  const [status, setStatus] = useState<ShipmentStatus>(initialValues.status ?? "pending");
  const isClosed = status === "returned";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType, status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="shipment-status">Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
            <SelectTrigger id="shipment-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block size-2.5 rounded-full ${SHIPMENT_STATUS_CONFIG[opt.value].badgeClass}`}
                    />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-eco">ECO</Label>
          <Input id="shipment-eco" value={eco} disabled={isClosed} onChange={(e) => setEco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-client">Cliente</Label>
          <Input
            id="shipment-client"
            value={client}
            disabled={isClosed}
            onChange={(e) => setClient(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-legalName">Razón social</Label>
          <Input
            id="shipment-legalName"
            value={legalName}
            disabled={isClosed}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-origin">Origen</Label>
          <Input id="shipment-origin" value={origin} disabled={isClosed} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-destination">Destino</Label>
          <Input
            id="shipment-destination"
            value={destination}
            disabled={isClosed}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-product">Producto</Label>
          <Input id="shipment-product" value={product} disabled={isClosed} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-pickupDate">Recolección</Label>
          <Input
            id="shipment-pickupDate"
            type="date"
            value={pickupDate}
            disabled={isClosed}
            onChange={(e) => setPickupDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-deliveryDate">Entrega</Label>
          <Input
            id="shipment-deliveryDate"
            type="date"
            value={deliveryDate}
            disabled={isClosed}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-operatorName">Nombre operador</Label>
          <Input
            id="shipment-operatorName"
            value={operatorName}
            disabled={isClosed}
            onChange={(e) => setOperatorName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-truck">Tracto</Label>
          <Input id="shipment-truck" value={truck} disabled={isClosed} onChange={(e) => setTruck(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-trailer">Caja</Label>
          <Input id="shipment-trailer" value={trailer} disabled={isClosed} onChange={(e) => setTrailer(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-unit">Unidad</Label>
          <Input id="shipment-unit" value={unit} disabled={isClosed} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-phone">Celular</Label>
          <Input id="shipment-phone" value={phone} disabled={isClosed} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-incident">Incidencia</Label>
          <Input id="shipment-incident" value={incident} disabled={isClosed} onChange={(e) => setIncident(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-incidentType">Tipo de incidencia</Label>
          <Input
            id="shipment-incidentType"
            value={incidentType}
            disabled={isClosed}
            onChange={(e) => setIncidentType(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipment-comments">Comentarios</Label>
        <Textarea
          id="shipment-comments"
          value={comments}
          disabled={isClosed}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
        />
      </div>
      <FormActions
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        isSubmitting={isSubmitting}
        submitDisabled={isClosed}
      />
    </form>
  );
}
