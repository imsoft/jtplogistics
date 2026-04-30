"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useUnitTypes } from "@/hooks/use-unit-types";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { getIncidentSelectOptions, incidentAllowsIncidentType } from "@/lib/incident-yes-no";
import { carrierProviderSelectOptions } from "@/lib/carrier-provider-options";
import type { Route } from "@/types/route.types";
import type { Shipment, ShipmentFormData, ShipmentStatus } from "@/types/shipment.types";
import type { Client } from "@/types/client.types";
import type { User } from "@/types/user.types";

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
  unlocked?: boolean;
}

export function ShipmentForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  unlocked = false,
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
  const isClosed = status === "returned" && !unlocked;

  const [routes, setRoutes] = useState<Route[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [carriers, setCarriers] = useState<User[]>([]);
  const unitTypes = useUnitTypes();
  const incidentTypes = useIncidentTypes();

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setRoutes(Array.isArray(data) ? (data as Route[]) : []);
      })
      .catch(() => setRoutes([]));
  }, []);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setClients(Array.isArray(data) ? (data as Client[]) : []);
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetch("/api/admin/users?role=carrier")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setCarriers(Array.isArray(data) ? (data as User[]) : []);
      })
      .catch(() => setCarriers([]));
  }, []);

  const origins = useMemo(() => {
    const s = new Set(routes.map((r) => r.origin).filter(Boolean));
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [routes]);

  const destinationsForOrigin = useMemo(() => {
    if (!origin) return [];
    const s = new Set(
      routes.filter((r) => r.origin === origin).map((r) => r.destination).filter(Boolean)
    );
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [routes, origin]);

  const originOptions = useMemo(() => {
    const o = origin.trim();
    if (o && !origins.includes(o)) return [o, ...origins];
    return origins;
  }, [origins, origin]);

  const destinationOptions = useMemo(() => {
    const d = destination.trim();
    const base = destinationsForOrigin;
    if (d && !base.includes(d)) return [d, ...base];
    return base;
  }, [destinationsForOrigin, destination]);

  const clientOptions = useMemo(() => {
    const names = clients.map((c) => c.name).filter(Boolean);
    const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b, "es"));
    const current = client.trim();
    if (current && !unique.includes(current)) return [current, ...unique];
    return unique;
  }, [clients, client]);

  const carrierOptions = useMemo(() => {
    const base = carrierProviderSelectOptions(carriers);
    const current = legalName.trim();
    if (current && !base.includes(current)) return [current, ...base];
    return base;
  }, [carriers, legalName]);

  const unitOptions = useMemo(() => {
    const u = unit.trim();
    const values = unitTypes.map((t) => t.value);
    if (u && !values.includes(u)) {
      return [{ value: u, label: u }, ...unitTypes];
    }
    return unitTypes;
  }, [unitTypes, unit]);

  const incidentSelectOptions = useMemo(() => getIncidentSelectOptions(incident), [incident]);

  const incidentTypeOptions = useMemo(() => {
    const t = incidentType.trim();
    const values = incidentTypes.map((x) => x.value);
    if (t && !values.includes(t)) {
      return [{ value: t, label: t }, ...incidentTypes];
    }
    return incidentTypes;
  }, [incidentTypes, incidentType]);

  const canPickIncidentType = incidentAllowsIncidentType(incident);

  useEffect(() => {
    if (!incidentAllowsIncidentType(incident)) setIncidentType("");
  }, [incident]);

  const onOriginChange = useCallback(
    (v: string) => {
      setOrigin(v);
      const dests = routes.filter((r) => r.origin === v).map((r) => r.destination);
      setDestination((prev) => (prev && dests.includes(prev) ? prev : ""));
    },
    [routes]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      eco,
      client,
      origin,
      destination,
      product,
      pickupDate,
      deliveryDate,
      legalName,
      operatorName,
      truck,
      trailer,
      unit,
      phone,
      comments,
      incident,
      incidentType: canPickIncidentType ? incidentType : "",
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="shipment-status">Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)} disabled={isClosed}>
            <SelectTrigger id="shipment-status" className="w-full">
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
          <Select
            value={client || undefined}
            onValueChange={setClient}
            disabled={isClosed || clientOptions.length === 0}
          >
            <SelectTrigger id="shipment-client" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clientOptions.map((clientName) => (
                <SelectItem key={clientName} value={clientName}>
                  {clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-origin">Origen</Label>
          <Select
            value={origin || undefined}
            onValueChange={onOriginChange}
            disabled={isClosed || originOptions.length === 0}
          >
            <SelectTrigger id="shipment-origin" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {originOptions.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-destination">Destino</Label>
          <Select
            value={destination || undefined}
            onValueChange={setDestination}
            disabled={isClosed || !origin.trim() || destinationOptions.length === 0}
          >
            <SelectTrigger id="shipment-destination" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {destinationOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Input id="shipment-operatorName" value={operatorName} disabled={isClosed} onChange={(e) => setOperatorName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="shipment-legalName">Proveedor (transportista)</Label>
          <Select
            value={legalName || undefined}
            onValueChange={setLegalName}
            disabled={isClosed || carrierOptions.length === 0}
          >
            <SelectTrigger id="shipment-legalName" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {carrierOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select
            value={unit || undefined}
            onValueChange={setUnit}
            disabled={isClosed || unitOptions.length === 0}
          >
            <SelectTrigger id="shipment-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((ut) => (
                <SelectItem key={ut.value} value={ut.value}>
                  {ut.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-phone">Celular</Label>
          <Input id="shipment-phone" value={phone} disabled={isClosed} onChange={(e) => setPhone(e.target.value)} />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shipment-incident">Incidencia</Label>
          <Select
            value={incident || undefined}
            onValueChange={(v) => {
              setIncident(v);
              if (!incidentAllowsIncidentType(v)) setIncidentType("");
            }}
            disabled={isClosed}
          >
            <SelectTrigger id="shipment-incident" className="w-full">
              <SelectValue />
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
          <Label htmlFor="shipment-incidentType">Tipo de incidencia</Label>
          <Select
            value={canPickIncidentType ? incidentType || undefined : undefined}
            onValueChange={setIncidentType}
            disabled={isClosed || !canPickIncidentType}
          >
            <SelectTrigger id="shipment-incidentType" className="w-full">
              <SelectValue />
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
      <FormActions
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}
