"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput, PlatesInput } from "@/components/ui/phone-plates-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { missingShipmentFields, missingShipmentMessage } from "@/lib/shipment-required";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { SHIPMENT_STATUSES } from "@/lib/shipment-statuses";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { getIncidentSelectOptions, incidentAllowsIncidentType } from "@/lib/incident-yes-no";
import { carrierByOption, carrierProviderSelectOptions } from "@/lib/carrier-provider-options";
import { shipmentLockReason } from "@/lib/shipment-lock";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { CalendarDays, CircleCheck, CircleDollarSign, MapPin, Plus, Trash2, TriangleAlert, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShipmentLettersButton } from "@/components/dashboard/resources/instruction-letter-button";
import { CartaPorteSection } from "@/components/dashboard/resources/carta-porte-section";
import { cartaPorteForDb, readCartaPorte } from "@/lib/carta-porte";
import type { Route } from "@/types/route.types";
import type { Shipment, ShipmentFormData, ShipmentStatus } from "@/types/shipment.types";
import type { Client } from "@/types/client.types";
import type { User } from "@/types/user.types";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const STATUS_OPTIONS = SHIPMENT_STATUSES.map((st) => ({ value: st.value as ShipmentStatus, label: st.label }));

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
  const [reference, setReference] = useState(initialValues.reference ?? "");
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
  // Direcciones en pares (ficha del cliente): se elige la de carga y la de
  // entrega sale sola. Un embarque ya guardado conserva las suyas hasta que
  // se cambie la ruta o se elija otro par.
  const [addressPairs, setAddressPairs] = useState<AddressPair[]>([]);
  const [pickedPairId, setPickedPairId] = useState<string | null>(null);
  const [keepSavedAddresses, setKeepSavedAddresses] = useState(Boolean(initialValues.originAddress || initialValues.destinationAddress));
  // Costos extra (maniobras, estadías…): se suman a venta y compra.
  const [extras, setExtras] = useState<{ concept: string; sale: string; cost: string }[]>(
    (initialValues.extraCosts ?? []).map((x) => ({
      concept: x.concept,
      sale: x.sale != null ? formatMxn(x.sale) : "",
      cost: x.cost != null ? formatMxn(x.cost) : "",
    }))
  );
  // Datos de la Carta Porte (ubicaciones, mercancías y autotransporte).
  const [cartaPorte, setCartaPorte] = useState(() => readCartaPorte(initialValues.cartaPorte ?? {}));
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
  const [missingError, setMissingError] = useState("");

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
        // Con unidad elegida solo vale la tarifa de esa unidad: si no la tiene, no se propone nada.
        const best = unit ? matches.find((r) => r.unitType === unit) ?? null : matches[0];
        const target = best?.clientTarget ?? null;
        setAgreed({ key, value: target });
        if (!saleTouched) setSale(target != null ? formatMxn(target) : "");
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
  if (!clientId && addressPairs.length > 0) setAddressPairs([]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/address-pairs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => !cancelled && setAddressPairs(Array.isArray(rows) ? rows : []))
      .catch(() => !cancelled && setAddressPairs([]));
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  // Los pares de las rutas con este origen y destino. Se empata por ciudad, no
  // por id: la ruta del cliente puede no estar en la lista del formulario
  // (p. ej. si está inactiva) y entonces sus direcciones no salían.
  const matchingPairs = useMemo(() => {
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    if (!origin.trim() || !destination.trim()) return [];
    return addressPairs.filter((p) => same(p.origin, origin) && same(p.destination, destination));
  }, [addressPairs, origin, destination]);
  const savedAddresses = keepSavedAddresses
    ? { originAddress: initialValues.originAddress ?? "", destinationAddress: initialValues.destinationAddress ?? "" }
    : null;
  const pickedPair =
    matchingPairs.find((p) => p.id === pickedPairId) ??
    (pickedPairId === null
      ? savedAddresses
        ? matchingPairs.find((p) => p.originAddress === savedAddresses.originAddress && p.destinationAddress === savedAddresses.destinationAddress)
        : matchingPairs[0]
      : undefined);
  const originAddress = pickedPair?.originAddress ?? savedAddresses?.originAddress ?? "";
  const destinationAddress = pickedPair?.destinationAddress ?? savedAddresses?.destinationAddress ?? "";
  // Otra ruta: las direcciones guardadas ya no aplican.
  const forgetAddresses = () => {
    setKeepSavedAddresses(false);
    setPickedPairId(null);
  };

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
        if (!costTouched) setCost(d.cost != null ? formatMxn(d.cost) : "");
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
    // Con el embarque bloqueado solo se guardan tarifas: ahí no se exigen los básicos.
    const missing = lockedAtLoad && showTariffs ? [] : missingShipmentFields({ client, origin, destination, unit });
    setMissingError(missingShipmentMessage(missing));
    if (missing.length > 0) return;
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
      reference,
      cartaPorte,
      incident,
      incidentType: canPickIncidentType ? incidentType : "",
      status,
    });
  }

  // Lo capturado en el formulario, para la carta de instrucciones y la carta porte.
  const letterData = {
    eco, client, product, pickupDate, deliveryDate, legalName, operatorName, phone, truck, trailer,
    unit: unitOptions.find((u) => u.value === unit)?.label ?? unit,
    origin, destination, originAddress, destinationAddress, comments,
    originContact: clientRecord?.contactName || client || "",
    destinationContact: clientRecord?.contactName || client || "",
    originPhone: clientRecord?.phone || phone || "",
    destinationPhone: clientRecord?.phone || phone || "",
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={MapPin} title="Cliente y ruta" description="Quién envía, de dónde a dónde y qué se mueve." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Label htmlFor="shipment-reference">Referencia</Label>
          <Input id="shipment-reference" value={reference} maxLength={80} disabled={isClosed} onChange={(e) => setReference(e.target.value)} />
          <p className="text-muted-foreground text-xs">La del cliente: su pedido, orden o folio. Sale en la imagen de seguimiento.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-client">
            <RequiredText>Cliente</RequiredText>
          </Label>
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
          <Label htmlFor="shipment-origin">
            <RequiredText>Origen</RequiredText>
          </Label>
          <AppSelect
            value={origin}
            onValueChange={(v) => {
              onOriginChange(v);
              forgetAddresses();
            }}
            options={originOptions.map((o) => ({value: o, label: o}))}
            disabled={isClosed || originOptions.length === 0}
            className="w-full"
          />
          <AddressPairPicker
            city={origin}
            destinationCity={destination}
            pairs={matchingPairs}
            pickedId={pickedPair?.id ?? null}
            savedOrigin={pickedPair ? null : savedAddresses?.originAddress || null}
            disabled={isClosed}
            hasClient={Boolean(clientId)}
            onPick={(id) => {
              setPickedPairId(id);
              setKeepSavedAddresses(false);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-destination">
            <RequiredText>Destino</RequiredText>
          </Label>
          <AppSelect
            value={destination}
            onValueChange={(v) => {
              setDestination(v);
              forgetAddresses();
            }}
            options={destinationOptions.map((d) => ({value: d, label: d}))}
            disabled={isClosed || !origin.trim() || destinationOptions.length === 0}
            className="w-full"
          />
          {destination.trim() && destinationAddress && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Dirección de entrega</p>
              {/* Sale sola del par elegido en la dirección de carga; no se edita aquí. */}
              <p className="bg-muted/40 text-muted-foreground min-h-9 rounded-md border px-3 py-2 text-sm" aria-readonly>
                {destinationAddress}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-product">Producto</Label>
          {(clientRecord?.productTypes.length ?? 0) > 0 ? (
            <AppSelect
              value={product}
              onValueChange={setProduct}
              options={[...clientRecord!.productTypes, ...(product && !clientRecord!.productTypes.includes(product) ? [product] : [])].map((x) => ({ value: x, label: x }))}
              disabled={isClosed}
              className="w-full"
            />
          ) : (
            <Input id="shipment-product" value={product} disabled={isClosed} onChange={(e) => setProduct(e.target.value)} />
          )}
          {clientRecord && clientRecord.productTypes.length === 0 && !isClosed && (
            <p className="text-muted-foreground text-xs">Este cliente no tiene productos capturados en su perfil; captúralos ahí para elegirlos aquí.</p>
          )}
        </div>
      </FormSection>

      <FormSection icon={CalendarDays} title="Fechas" description="Cuándo se recoge y cuándo se entrega." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </FormSection>

      <FormSection icon={Truck} title="Transportista y unidad" description="Quién lo mueve y con qué equipo." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
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
          <Label htmlFor="shipment-unit">
            <RequiredText>Unidad</RequiredText>
          </Label>
          <AppSelect
            value={unit}
            onValueChange={setUnit}
            options={unitOptions}
            disabled={isClosed || unitOptions.length === 0}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-operatorName">Nombre operador</Label>
          <Input id="shipment-operatorName" value={operatorName} disabled={isClosed} onChange={(e) => setOperatorName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipment-phone">Celular</Label>
          <PhoneInput id="shipment-phone" value={phone} disabled={isClosed} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="shipment-truck">Tracto</Label>
            <PlatesInput id="shipment-truck" value={truck} disabled={isClosed} onChange={(e) => setTruck(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipment-trailer">Caja</Label>
            <PlatesInput id="shipment-trailer" value={trailer} disabled={isClosed} onChange={(e) => setTrailer(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection icon={TriangleAlert} title="Incidencias y comentarios" description="Solo si algo salió distinto a lo planeado." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
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
          {!canPickIncidentType && !isClosed && <p className="text-muted-foreground text-xs">Se activa si hubo incidencia.</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="shipment-comments">Comentarios</Label>
        <Textarea
          id="shipment-comments"
          value={comments}
          disabled={isClosed}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
        />
        </div>
      </FormSection>

      {showTariffs && (
        <FormSection
          icon={CircleDollarSign}
          title="Tarifas"
          description={
            lockedAtLoad
              ? "El embarque está bloqueado, pero las tarifas sí se pueden capturar."
              : "Solo las ven dirección y quien tiene acceso a Finanzas. Al cerrar el embarque pasan a la tabla de finanzas."
          }
          aside={<span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Confidencial</span>}
        >
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
                <p className={`flex items-center gap-1 text-xs ${parseMxn(sale) === agreedSale ? "text-green-700" : "text-muted-foreground"}`}>
                  {parseMxn(sale) === agreedSale ? (
                    <>
                      <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                      Es la tarifa acordada con el cliente para esta ruta y unidad.
                    </>
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
                <p className={`flex items-center gap-1 text-xs ${parseMxn(cost) === agreedCostValue ? "text-green-700" : "text-muted-foreground"}`}>
                  {parseMxn(cost) === agreedCostValue ? (
                    <>
                      <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                      Es la tarifa pactada con el transportista para esta ruta y unidad.
                    </>
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
          <div className="mt-5 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">Costos extra</p>
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
        </FormSection>
      )}

      <CartaPorteSection
        value={cartaPorte}
        onChange={setCartaPorte}
        disabled={isClosed}
        carrierId={carrierId}
        truck={truck}
        trailer={trailer}
      />

      {missingError && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {missingError}
        </p>
      )}

      <FormActions
        sticky
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        isSubmitting={isSubmitting}
        leading={
          <ShipmentLettersButton data={letterData} cartaPorte={cartaPorteForDb(cartaPorte)} />
        }
      />
    </form>
  );
}


interface AddressPair {
  id: string;
  routeId: string;
  origin: string;
  destination: string;
  originAddress: string;
  destinationAddress: string;
}

/**
 * Elige la dirección de carga entre los pares del cliente para la ruta; la de
 * entrega sale del par. Si una misma dirección de carga tiene varios destinos,
 * cada opción dice a dónde va. La guardada que ya no esté en la ficha también
 * se muestra.
 */
function AddressPairPicker({
  city,
  destinationCity,
  pairs,
  pickedId,
  savedOrigin,
  disabled,
  hasClient,
  onPick,
}: {
  city: string;
  destinationCity: string;
  pairs: AddressPair[];
  pickedId: string | null;
  savedOrigin: string | null;
  disabled: boolean;
  hasClient: boolean;
  onPick: (id: string) => void;
}) {
  if (!city.trim()) return null;
  if (pairs.length === 0 && !savedOrigin) {
    return (
      <p className="text-muted-foreground text-xs">
        {!hasClient
          ? "Elige el cliente para ver sus direcciones."
          : destinationCity.trim()
            ? "Este cliente no tiene direcciones guardadas para esta ruta; captúralas en su ficha."
            : "Elige el destino para ver las direcciones."}
      </p>
    );
  }
  const repeated = (o: string) => pairs.filter((p) => p.originAddress === o).length > 1;
  const SAVED = "__guardada__";
  const options = [
    ...pairs.map((p) => ({ value: p.id, label: repeated(p.originAddress) ? `${p.originAddress} → ${p.destinationAddress}` : p.originAddress })),
    ...(savedOrigin ? [{ value: SAVED, label: savedOrigin }] : []),
  ];
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Dirección de carga</p>
      <AppSelect
        value={pickedId ?? (savedOrigin ? SAVED : "")}
        onValueChange={(v) => v && v !== SAVED && onPick(v)}
        options={options}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
