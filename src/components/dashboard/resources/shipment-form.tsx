"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import type { Shipment, ShipmentFormData } from "@/types/shipment.types";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="shipment-eco">ECO</Label>
          <Input id="shipment-eco" value={eco} onChange={(e) => setEco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-client">Cliente</Label>
          <Input id="shipment-client" value={client} onChange={(e) => setClient(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-legalName">Razón social</Label>
          <Input id="shipment-legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-origin">Origen</Label>
          <Input id="shipment-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-destination">Destino</Label>
          <Input id="shipment-destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-product">Producto</Label>
          <Input id="shipment-product" value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-pickupDate">Recolección</Label>
          <Input id="shipment-pickupDate" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-deliveryDate">Entrega</Label>
          <Input id="shipment-deliveryDate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-operatorName">Nombre operador</Label>
          <Input id="shipment-operatorName" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-truck">Tracto</Label>
          <Input id="shipment-truck" value={truck} onChange={(e) => setTruck(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-trailer">Caja</Label>
          <Input id="shipment-trailer" value={trailer} onChange={(e) => setTrailer(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-unit">Unidad</Label>
          <Input id="shipment-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-phone">Celular</Label>
          <Input id="shipment-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-incident">Incidencia</Label>
          <Input id="shipment-incident" value={incident} onChange={(e) => setIncident(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-incidentType">Tipo de incidencia</Label>
          <Input id="shipment-incidentType" value={incidentType} onChange={(e) => setIncidentType(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipment-comments">Comentarios</Label>
        <Textarea id="shipment-comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
      </div>
      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} isSubmitting={isSubmitting} />
    </form>
  );
}
