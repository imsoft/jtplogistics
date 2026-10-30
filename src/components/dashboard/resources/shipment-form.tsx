"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { AppMultiSelect } from "@/components/ui/app-multi-select";
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { getIncidentSelectOptions, incidentAllowsIncidentType } from "@/lib/incident-yes-no";
import { carrierByOption, carrierProviderSelectOptions } from "@/lib/carrier-provider-options";
import { shipmentLockReason } from "@/lib/shipment-lock";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstructionLetterButton } from "@/components/dashboard/resources/instruction-letter-button";
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
  { value: "in_transit", label: SHIPMENT_STATUS_CONFIG.in_transit.label },
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
  scope?: "admin" | "collaborator";
  /** Dirección y quien ve Finanzas: captura de tarifa de venta y de compra. */
  showTariffs?: boolean;
}

export function ShipmentForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  unlocked = false,
  scope = "admin",
  showTariffs = false,
}: ShipmentFormProps) {
  // ?all=1 en los dos: la API pagina, y sin él el selector solo traería los
  // primeros 20 clientes sin avisar que faltan los demás.
  const clientsEndpoint = scope === "collaborator" ? "/api/collaborator/clients?all=1" : "/api/admin/clients?all=1";
  const carriersEndpoint = scope === "collaborator" ? "/api/collaborator/shipment-carriers" : "/api/admin/users?role=carrier";
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
  // Direcciones: se proponen de la ficha del cliente mientras no se escriban a mano.
  const [originAddressInput, setOriginAddress] = useState(initialValues.originAddress ?? "");
  const [destinationAddressInput, setDestinationAddress] = useState(initialValues.destinationAddress ?? "");
  const [originAddressTouched, setOriginAddressTouched] = useState(Boolean(initialValues.originAddress));
  const [destinationAddressTouched, setDestinationAddressTouched] = useState(Boolean(initialValues.destinationAddress));
  const [locations, setLocations] = useState<{ routeId: string | null; kind: string; city: string; address: string }[]>([]);
  // Costos extra (maniobras, estadías…): se suman a venta y compra.
  const [extras, setExtras] = useState<{ concept: string; sale: string; cost: string }[]>(
    (initialValues.extraCosts ?? []).map((x) => ({
      concept: x.concept,
      sale: x.sale != null ? formatMxn(x.sale) : "",
      cost: x.cost != null ? formatMxn(x.cost) : "",
    }))
  );
  const [incident, setIncident] = useState(initialValues.incident ?? "");
  // Si la incidencia guardada no admite tipo, se arranca sin él (el onChange
  // de la incidencia lo limpia en los demás casos).
  const [incidentType, setIncidentType] = useState(
    incidentAllowsIncidentType(initialValues.incident ?? "") ? initialValues.incidentType ?? "" : ""
  );
  const [status, setStatus] = useState<ShipmentStatus>(initialValues.status ?? "pending");
  const [sale, setSale] = useState(initialValues.sale != null ? formatMxn(initialValues.sale) : "");
  const [cost, setCost] = useState(initialValues.cost != null ? formatMxn(initialValues.cost) : "");
  // Tarifa acordada con el cliente para esta ruta (Clientes → rutas asignadas).
  const [agreed, setAgreed] = useState<{ key: string; value: number | null } | null>(null);
  const [saleTouched, setSaleTouched] = useState(initialValues.sale != null);
  // Tarifa pactada con el transportista para esta ruta (su target).
  const [agreedCost, setAgreedCost] = useState<{ key: string; value: number | null } | null>(null);
  const [costTouched, setCostTouched] = useState(initialValues.cost != null);
  // Cerrado, o ya asentado sin incidencias: de solo lectura (salvo desbloqueo).
  // El "sin incidencias" se mira sobre lo guardado, no sobre lo que se está
  // eligiendo ahora: cambiar el select no debe congelar el formulario.
  const isClosed = (status === "returned" || shipmentLockReason({ incident: initialValues.incident }) !== null) && !unlocked;
  // isClosed también se prende al elegir "Cerrado" en el formulario; para saber
  // si solo se pueden guardar tarifas importa cómo estaba al abrirlo.
  const lockedAtLoad = shipmentLockReason(initialValues) !== null && !unlocked;

  const [routes, setRoutes] = useState<Route[]>([]);

  // Embarque nuevo: propone el siguiente ECO consecutivo (se puede cambiar).
  useEffect(() => {
    if (initialValues.id || initialValues.eco) return;
    fetch("/api/shipments/next-eco")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { eco?: string } | null) => d?.eco && setEco((cur) => cur || d.eco!))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, []);
  const [clients, setClients] = useState<Client[]>([]);
  const [carriers, setCarriers] = useState<User[]>([]);
  const unitTypes = useUnitTypes();
  const incidentTypes = useIncidentTypes();

  useEffect(() => {
    // El colaborador toma rutas y clientes de un endpoint propio de Embarques:
    // con /api/routes y la lista de clientes necesitaba además esos permisos y
    // el formulario se quedaba sin origen, destino ni cliente.
    if (scope === "collaborator") {
      fetch("/api/collaborator/shipment-options")
        .then((r) => (r.ok ? r.json() : { routes: [], clients: [] }))
        .then((d: { routes?: Route[]; clients?: Client[] }) => {
          setRoutes(Array.isArray(d.routes) ? d.routes : []);
          setClients(Array.isArray(d.clients) ? d.clients : []);
        })
        .catch(() => {
          setRoutes([]);
          setClients([]);
        });
      return;
    }
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setRoutes(Array.isArray(data) ? (data as Route[]) : []);
      })
      .catch(() => setRoutes([]));
    fetch(clientsEndpoint)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res: unknown) => {
        // El endpoint admin responde { data: [...] }.
        const arr = Array.isArray(res) ? res : (res as { data?: unknown })?.data;
        setClients(Array.isArray(arr) ? (arr as Client[]) : []);
      })
      .catch(() => setClients([]));
  }, [scope, clientsEndpoint]);

  useEffect(() => {
    fetch(carriersEndpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setCarriers(Array.isArray(data) ? (data as User[]) : []);
      })
      .catch(() => setCarriers([]));
  }, [carriersEndpoint]);

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
    // El guardado pasa el texto a minúsculas: se compara sin mayúsculas para
    // no duplicar la opción ni dejar el campo vacío al editar.
    if (current && !unique.some((n) => n.toLowerCase() === current.toLowerCase())) return [current, ...unique];
    return unique;
  }, [clients, client]);
  const clientValue = clientOptions.find((n) => n.toLowerCase() === client.trim().toLowerCase()) ?? client;

  const carrierOptions = useMemo(() => {
    const base = carrierProviderSelectOptions(carriers);
    const current = legalName.trim();
    if (current && !base.some((n) => n.toLowerCase() === current.toLowerCase())) return [current, ...base];
    return base;
  }, [carriers, legalName]);
  const carrierValue = carrierOptions.find((n) => n.toLowerCase() === legalName.trim().toLowerCase()) ?? legalName;

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

  const onOriginChange = useCallback(
    (v: string) => {
      setOrigin(v);
      const dests = routes.filter((r) => r.origin === v).map((r) => r.destination);
      setDestination((prev) => (prev && dests.includes(prev) ? prev : ""));
    },
    [routes]
  );

  // Propone la tarifa de venta acordada con el cliente para esta ruta. Si no
  // hay acceso a las rutas del cliente, simplemente no propone nada.
  useEffect(() => {
    if (!showTariffs) return;
    const c = clients.find((x) => x.name.trim().toLowerCase() === client.trim().toLowerCase());
    if (!c || !origin.trim() || !destination.trim()) return;
    const key = `${c.id}|${origin}|${destination}|${unit}`;
    let cancelled = false;
    fetch(`/api/clients/${c.id}/routes?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { origin: string; destination: string; unitType: string; clientTarget: number | null }[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
        const matches = rows.filter((r) => same(r.origin, origin) && same(r.destination, destination) && r.clientTarget != null);
        const best = matches.find((r) => unit && r.unitType === unit) ?? matches[0];
        const target = best?.clientTarget ?? null;
        setAgreed({ key, value: target });
        if (target != null && !saleTouched) setSale(formatMxn(target));
      })
      .catch(() => {
        if (!cancelled) setAgreed({ key, value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [showTariffs, clients, client, origin, destination, unit, saleTouched]);

  // Direcciones del cliente (ficha del cliente → direcciones de origen y destino).
  const clientRecord = clients.find((x) => x.name.trim().toLowerCase() === client.trim().toLowerCase());
  const clientId = clientRecord?.id;
  // Sin cliente no hay direcciones.
  if (!clientId && locations.length > 0) setLocations([]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/locations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => !cancelled && setLocations(Array.isArray(rows) ? rows : []))
      .catch(() => !cancelled && setLocations([]));
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  // Las direcciones van por ruta: las de las rutas con este origen y destino.
  const routeIds = useMemo(() => {
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    return new Set(routes.filter((r) => origin && destination && same(r.origin, origin) && same(r.destination, destination)).map((r) => r.id));
  }, [routes, origin, destination]);
  const addressesFor = useCallback(
    (kind: "origin" | "destination") => [...new Set(locations.filter((l) => l.kind === kind && l.routeId && routeIds.has(l.routeId)).map((l) => l.address))],
    [locations, routeIds]
  );
  const originChoices = addressesFor("origin");
  const destinationChoices = addressesFor("destination");
  // Mientras no se toque el campo, se propone la primera dirección.
  const originAddress = originAddressTouched ? originAddressInput : originChoices[0] ?? "";
  const destinationAddress = destinationAddressTouched ? destinationAddressInput : destinationChoices[0] ?? "";

  // Propone la tarifa de compra pactada con el transportista para esta ruta.
  const carrierMap = useMemo(() => carrierByOption(carriers), [carriers]);
  const carrierId = carrierMap.get(legalName.trim().toLowerCase())?.id;
  useEffect(() => {
    if (!showTariffs || !carrierId || !origin.trim() || !destination.trim()) return;
    const key = `${carrierId}|${origin}|${destination}|${unit}`;
    let cancelled = false;
    const qs = new URLSearchParams({ carrierId, origin, destination, unitType: unit });
    fetch(`/api/shipment-carrier-rate?${qs}`)
      .then((r) => (r.ok ? r.json() : { cost: null }))
      .then((d: { cost: number | null }) => {
        if (cancelled) return;
        setAgreedCost({ key, value: d.cost });
        if (d.cost != null && !costTouched) setCost(formatMxn(d.cost));
      })
      .catch(() => !cancelled && setAgreedCost({ key, value: null }));
    return () => {
      cancelled = true;
    };
  }, [showTariffs, carrierId, origin, destination, unit, costTouched]);
  const agreedCostValue = agreedCost && agreedCost.key === `${carrierId}|${origin}|${destination}|${unit}` ? agreedCost.value : null;


  // Solo vale la tarifa propuesta para el cliente y la ruta que están elegidos ahora.
  const agreedClient = clients.find((x) => x.name.trim().toLowerCase() === client.trim().toLowerCase());
  const agreedSale =
    agreed && agreedClient && agreed.key === `${agreedClient.id}|${origin}|${destination}|${unit}` ? agreed.value : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tariffs = showTariffs
      ? { sale: sale.trim(), cost: cost.trim(), extraCosts: extras.filter((x) => x.concept.trim() || x.sale.trim() || x.cost.trim()) }
      : {};
    // Bloqueado desde que se abrió: lo único que se puede guardar son las tarifas.
    if (lockedAtLoad && showTariffs) {
      onSubmit(tariffs as ShipmentFormData);
      return;
    }
    onSubmit({
      ...tariffs,
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
      originAddress,
      destinationAddress,
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
          <AppSelect
            value={status}
            onValueChange={(v) => setStatus(v as ShipmentStatus)}
            options={STATUS_OPTIONS}
            disabled={isClosed}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-eco">ECO</Label>
          <Input id="shipment-eco" value={eco} disabled={isClosed} onChange={(e) => setEco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-client">Cliente</Label>
          <AppSelect
            value={clientValue}
            onValueChange={(v) => {
              setClient(v);
              // Otro cliente: su tarifa acordada sustituye a la anterior.
              setSaleTouched(false);
            }}
            options={clientOptions.map((clientName) => ({value: clientName, label: clientName}))}
            disabled={isClosed || clientOptions.length === 0}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-origin">Origen</Label>
          <AppSelect
            value={origin}
            onValueChange={onOriginChange}
            options={originOptions.map((o) => ({value: o, label: o}))}
            disabled={isClosed || originOptions.length === 0}
            className="w-full"
          />
          <AddressList
            label="Dirección de carga"
            city={origin}
            choices={originChoices}
            value={originAddress}
            disabled={isClosed}
            hasClient={Boolean(clientId)}
            onSelect={(v) => {
              setOriginAddressTouched(true);
              setOriginAddress(v);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-destination">Destino</Label>
          <AppSelect
            value={destination}
            onValueChange={setDestination}
            options={destinationOptions.map((d) => ({value: d, label: d}))}
            disabled={isClosed || !origin.trim() || destinationOptions.length === 0}
            className="w-full"
          />
          <AddressList
            label="Dirección de entrega"
            city={destination}
            choices={destinationChoices}
            value={destinationAddress}
            disabled={isClosed}
            hasClient={Boolean(clientId)}
            onSelect={(v) => {
              setDestinationAddressTouched(true);
              setDestinationAddress(v);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-product">Producto</Label>
          <AppMultiSelect
            id="shipment-product"
            value={splitList(product, ", ")}
            onValueChange={(list) => setProduct(list.join(", "))}
            options={clientRecord?.productTypes ?? []}
            allowCustom
            disabled={isClosed}
          />
          <p className="text-muted-foreground text-xs">
            {clientRecord && clientRecord.productTypes.length === 0
              ? "Este cliente no tiene productos capturados en su perfil; escribe el producto y agrégalo con Enter."
              : "Puede llevar varios; también puedes escribir uno y agregarlo con Enter."}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-pickupDate">Recolección</Label>
          <DatePicker
            id="shipment-pickupDate"
            value={pickupDate}
            disabled={isClosed}
            onChange={(value) => setPickupDate(value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-deliveryDate">Entrega</Label>
          <DatePicker
            id="shipment-deliveryDate"
            value={deliveryDate}
            disabled={isClosed}
            onChange={(value) => setDeliveryDate(value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-operatorName">Nombre operador</Label>
          <Input id="shipment-operatorName" value={operatorName} disabled={isClosed} onChange={(e) => setOperatorName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="shipment-legalName">Proveedor (transportista)</Label>
          <AppSelect
            value={carrierValue}
            onValueChange={(v) => {
              setLegalName(v);
              // Otro transportista: su tarifa pactada sustituye a la anterior.
              setCostTouched(false);
            }}
            options={carrierOptions.map((name) => ({value: name, label: name}))}
            disabled={isClosed || carrierOptions.length === 0}
            className="w-full"
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
          <AppSelect
            value={unit}
            onValueChange={setUnit}
            options={unitOptions}
            disabled={isClosed || unitOptions.length === 0}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-phone">Celular</Label>
          <Input id="shipment-phone" value={phone} disabled={isClosed} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shipment-incident">Incidencia</Label>
          <AppSelect
            value={incident}
            onValueChange={(v) => {
              setIncident(v);
              if (!incidentAllowsIncidentType(v)) setIncidentType("");
            }}
            options={incidentSelectOptions}
            disabled={isClosed}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-incidentType">Tipo de incidencia</Label>
          <AppSelect
            value={canPickIncidentType ? incidentType : ""}
            onValueChange={setIncidentType}
            options={incidentTypeOptions}
            disabled={isClosed || !canPickIncidentType}
            className="w-full"
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
      {showTariffs && (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-semibold">Tarifas</p>
            <p className="text-muted-foreground text-xs">
              {lockedAtLoad
                ? "El embarque está bloqueado, pero las tarifas sí se pueden capturar."
                : "Solo las ven dirección y quien tiene acceso a Finanzas. Al cerrar el embarque pasan a la tabla de finanzas."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipment-sale">Tarifa de venta (precio al cliente)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  id="shipment-sale"
                  inputMode="decimal"
                  value={sale}
                  onChange={(e) => {
                    setSaleTouched(true);
                    setSale(formatMxnLive(e.target.value));
                  }}
                />
              </div>
              {agreedSale != null && (
                <p className="text-muted-foreground text-xs">
                  {parseMxn(sale) === agreedSale ? (
                    "Es la tarifa acordada con el cliente para esta ruta."
                  ) : (
                    <>
                      Tarifa acordada con el cliente para esta ruta: ${formatMxn(agreedSale)}.{" "}
                      <button
                        type="button"
                        className="text-primary font-medium underline-offset-2 hover:underline"
                        onClick={() => {
                          setSaleTouched(true);
                          setSale(formatMxn(agreedSale));
                        }}
                      >
                        Usarla
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipment-cost">Tarifa de compra (precio del transportista)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  id="shipment-cost"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => {
                    setCostTouched(true);
                    setCost(formatMxnLive(e.target.value));
                  }}
                />
              </div>
              {agreedCostValue != null && (
                <p className="text-muted-foreground text-xs">
                  {parseMxn(cost) === agreedCostValue ? (
                    "Es la tarifa pactada con el transportista para esta ruta."
                  ) : (
                    <>
                      Tarifa pactada con el transportista para esta ruta: ${formatMxn(agreedCostValue)}.{" "}
                      <button
                        type="button"
                        className="text-primary font-medium underline-offset-2 hover:underline"
                        onClick={() => {
                          setCostTouched(true);
                          setCost(formatMxn(agreedCostValue));
                        }}
                      >
                        Usarla
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Costos extra</p>
                <p className="text-muted-foreground text-xs">Maniobras, estadías, casetas… Se suman a la venta y a la compra.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setExtras((l) => [...l, { concept: "", sale: "", cost: "" }])}>
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>
            {extras.map((x, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`extra-concept-${i}`} className="text-xs">Concepto</Label>
                  <Input id={`extra-concept-${i}`} value={x.concept} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, concept: e.target.value } : y)))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`extra-sale-${i}`} className="text-xs">Venta ($)</Label>
                  <Input id={`extra-sale-${i}`} inputMode="decimal" value={x.sale} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, sale: formatMxnLive(e.target.value) } : y)))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`extra-cost-${i}`} className="text-xs">Compra ($)</Label>
                  <Input id={`extra-cost-${i}`} inputMode="decimal" value={x.cost} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, cost: formatMxnLive(e.target.value) } : y)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar costo extra" onClick={() => setExtras((l) => l.filter((_, j) => j !== i))}>
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <InstructionLetterButton
          data={{
            eco, client, product, pickupDate, deliveryDate, legalName, operatorName, phone, truck, trailer,
            unit: unitOptions.find((u) => u.value === unit)?.label ?? unit,
            origin, destination, originAddress, destinationAddress, comments,
          }}
        />
      </div>
      <FormActions
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}

/** Separador con el que se guardan varias direcciones en un mismo campo. */
const ADDRESS_SEP = "; ";
const splitList = (value: string, sep: string) => value.split(sep.trim()).map((x) => x.trim()).filter(Boolean);

/** Direcciones del cliente para esa ciudad en la ruta elegida; puede marcar varias. */
function AddressList({ label, city, choices, value, disabled, hasClient, onSelect }: { label: string; city: string; choices: string[]; value: string; disabled: boolean; hasClient: boolean; onSelect: (address: string) => void }) {
  if (!city.trim()) return null;
  if (choices.length === 0 && !value) {
    return (
      <p className="text-muted-foreground text-xs">
        {hasClient ? "Este cliente no tiene direcciones guardadas para esta ruta; captúralas en su ficha." : "Elige el cliente para ver sus direcciones."}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <AppMultiSelect value={splitList(value, ADDRESS_SEP)} onValueChange={(list) => onSelect(list.join(ADDRESS_SEP))} options={choices} disabled={disabled} />
    </div>
  );
}
