"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ImageIcon, Loader2, MessageSquareText, RefreshCw, Send, TriangleAlert, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { FormSection } from "@/components/ui/form-section";
import { PhoneInput } from "@/components/ui/phone-plates-input";
import { FormSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";
import { shipmentStatusLabel } from "@/lib/shipment-statuses";
import { WHATSAPP_TEMPLATES, fillTemplate, missingParams, templateByName, whatsappNumber } from "@/lib/whatsapp-templates";

interface Status {
  configured: boolean;
  missing: string[];
  phoneNumberId: string;
  businessAccountId: string;
  templates: { name: string; status: string; language: string; category: string }[];
  templatesError?: string;
}

interface ShipmentOption {
  id: string;
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
}

type Kind = "template" | "text" | "image";

interface SentLog {
  at: string;
  to: string;
  what: string;
  ok: boolean;
  detail: string;
}

const META_STATUS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprobada", className: "bg-green-100 text-green-800" },
  PENDING: { label: "En revisión", className: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Rechazada", className: "bg-red-100 text-red-800" },
  PAUSED: { label: "Pausada", className: "bg-gray-200 text-gray-800" },
  DISABLED: { label: "Desactivada", className: "bg-gray-200 text-gray-800" },
};

/** Valor de cada variable de la plantilla a partir del embarque elegido. */
function paramFromShipment(param: string, s: ShipmentOption | undefined): string {
  if (!s) return "";
  switch (param) {
    case "Cliente":
      return s.client ?? "";
    case "ECO":
      return s.eco ?? "";
    case "Ruta":
      return [s.origin, s.destination].filter(Boolean).join(" - ");
    case "Destino":
      return s.destination ?? "";
    case "Estado":
    case "Motivo":
      return shipmentStatusLabel(s.status);
    default:
      return "";
  }
}

/** Burbuja estilo WhatsApp para la vista previa. */
function Bubble({ children, image }: { children?: React.ReactNode; image?: string }) {
  return (
    <div className="rounded-xl bg-[#ECE5DD] p-4">
      <div className="max-w-sm rounded-lg bg-white p-2 text-sm shadow-sm">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen generada al momento
          <img src={image} alt="Imagen de seguimiento" className="mb-2 aspect-square w-full rounded-md border" />
        )}
        {children && <p className="px-1 whitespace-pre-wrap">{children}</p>}
        <p className="text-muted-foreground mt-1 px-1 text-right text-[10px]">JTP LOGISTICS</p>
      </div>
    </div>
  );
}

export function WhatsAppDemos() {
  const [status, setStatus] = useState<Status | null>(null);
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [registering, setRegistering] = useState(false);
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<Kind>("template");
  const [templateName, setTemplateName] = useState("jtp_seguimiento_embarque");
  const [shipmentId, setShipmentId] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<SentLog[]>([]);

  const loadStatus = useCallback(() => {
    fetch("/api/admin/whatsapp")
      .then((r) => r.json())
      .then((d: Status) => setStatus(d))
      .catch(() => toast.error("No se pudo leer la configuración de WhatsApp."));
  }, []);

  useEffect(() => {
    loadStatus();
    fetch("/api/admin/shipments?pageSize=50")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d: { data?: ShipmentOption[] }) => setShipments(Array.isArray(d.data) ? d.data : []))
      .catch(() => setShipments([]));
  }, [loadStatus]);

  const template = templateByName(templateName);
  const shipment = shipments.find((s) => s.id === shipmentId);

  // Al cambiar de plantilla o de embarque, las variables se llenan con el embarque.
  function prefill(tName: string, sId: string) {
    const t = templateByName(tName);
    const s = shipments.find((x) => x.id === sId);
    setParams(t ? t.params.map((p) => paramFromShipment(p, s)) : []);
    if (s && !caption) setCaption(`SEGUIMIENTO DE TU EMBARQUE ${s.eco ?? ""}`.trim());
  }

  const metaStatus = useMemo(() => new Map((status?.templates ?? []).map((t) => [t.name, t])), [status]);
  const pendingToRegister = WHATSAPP_TEMPLATES.filter((t) => !t.builtIn && !metaStatus.has(t.name)).length;

  async function registerTemplates() {
    setRegistering(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register-templates" }),
      });
      const d = (await res.json().catch(() => ({}))) as { results?: { name: string; result: string }[]; error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudieron registrar.");
      for (const r of d.results ?? []) toast.message(`${r.name}: ${r.result}`);
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron registrar.");
    } finally {
      setRegistering(false);
    }
  }

  async function send() {
    const number = whatsappNumber(to);
    if (!number) {
      toast.error("Escribe un número de celular válido.");
      return;
    }
    const body =
      kind === "template"
        ? { to, kind, template: templateName, params }
        : kind === "text"
          ? { to, kind, text }
          : { to, kind, shipmentId, caption };
    const what =
      kind === "template" ? `Plantilla: ${template?.title ?? templateName}` : kind === "text" ? "Texto libre" : `Imagen de seguimiento ${shipment?.eco ?? ""}`;
    setSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; messageId?: string };
      const ok = res.ok;
      setLog((l) => [
        { at: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }), to: number, what, ok, detail: ok ? "Enviado a WhatsApp" : d.error ?? "No se pudo enviar" },
        ...l,
      ]);
      if (ok) toast.success("Mensaje enviado. Revisa el WhatsApp de ese número.");
      else toast.error(d.error ?? "No se pudo enviar.");
    } catch {
      toast.error("No se pudo enviar.");
    } finally {
      setSending(false);
    }
  }

  if (!status) return <FormSkeleton fields={4} />;

  const missingVars = kind === "template" && template ? missingParams(template, params) : [];
  // Solo se manda una plantilla aprobada en Meta (si no, WhatsApp la rechaza).
  const templateApproved = !!template && (metaStatus.get(template.name)?.status === "APPROVED" || (template.builtIn === true && !metaStatus.has(template.name)));
  const canSend =
    status.configured &&
    !!whatsappNumber(to) &&
    (kind === "template" ? templateApproved && missingVars.length === 0 : kind === "text" ? !!text.trim() : !!shipmentId);

  return (
    <div className="max-w-5xl space-y-5">
      {/* Conexión */}
      <FormSection
        icon={status.configured ? CheckCircle2 : TriangleAlert}
        title="Conexión con WhatsApp"
        description={status.configured ? "Lista para mandar mensajes desde el número de prueba de Meta." : "Faltan datos para conectarse."}
      >
        {status.configured ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Número (Phone Number ID): </span>
              <span className="font-medium tabular-nums">{status.phoneNumberId}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Cuenta de WhatsApp: </span>
              <span className="font-medium tabular-nums">{status.businessAccountId}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              Con el número de prueba solo llegan mensajes a los celulares registrados en Meta (hasta 5): Paso 1, campo &quot;Para&quot;.
            </p>
          </div>
        ) : (
          <p className="text-sm">
            Agrega en Vercel (y en el .env local): <span className="font-medium">{status.missing.join(", ")}</span>.
          </p>
        )}
      </FormSection>

      {/* Plantillas */}
      <FormSection
        icon={Waypoints}
        title="Plantillas"
        description="WhatsApp solo deja escribir primero con plantillas aprobadas por Meta."
        aside={
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={loadStatus}>
              <RefreshCw className="size-4" />
              Actualizar
            </Button>
            {pendingToRegister > 0 && status.configured && (
              <Button type="button" size="sm" onClick={registerTemplates} disabled={registering}>
                {registering && <Loader2 className="size-4 animate-spin" />}
                Mandar a revisión ({pendingToRegister})
              </Button>
            )}
          </div>
        }
      >
        {status.templatesError && <p className="text-destructive mb-3 text-sm">{status.templatesError}</p>}
        <ul className="divide-y rounded-lg border">
          {WHATSAPP_TEMPLATES.map((t) => {
            const meta = metaStatus.get(t.name);
            const st = meta ? (META_STATUS[meta.status] ?? { label: meta.status, className: "bg-gray-100 text-gray-800" }) : null;
            return (
              <li key={t.name} className="flex flex-wrap items-start justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs normal-case">{t.name}</p>
                  {!t.builtIn && <p className="text-muted-foreground mt-1 text-xs">{t.body}</p>}
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st?.className ?? "bg-gray-100 text-gray-600")}>
                  {st?.label ?? "Sin registrar"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-2 text-xs">
          &quot;Mandar a revisión&quot; registra en Meta las plantillas de JTP que falten. Suelen aprobarse en minutos u horas; mientras tanto, usa Hello World.
        </p>
      </FormSection>

      {/* Enviar */}
      <FormSection icon={Send} title="Mandar una prueba" description="Elige a quién, qué y de qué embarque; revisa la vista previa y mándalo.">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wa-to">Celular que recibe</Label>
              <PhoneInput id="wa-to" value={to} onChange={(e) => setTo(e.target.value)} />
              <p className="text-muted-foreground text-xs">10 dígitos (se agrega +52) o con lada de país. Debe estar registrado en Meta.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Embarque</Label>
              <AppSelect
                value={shipmentId}
                onValueChange={(v) => {
                  setShipmentId(v);
                  prefill(templateName, v);
                }}
                options={shipments.map((s) => ({ value: s.id, label: `${s.eco ?? "Sin ECO"} · ${s.client ?? "—"} · ${shipmentStatusLabel(s.status)}` }))}
                className="w-full"
              />
              <p className="text-muted-foreground text-xs">Llena las variables y genera la imagen de seguimiento.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de mensaje</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["template", "Plantilla", Waypoints],
                    ["text", "Texto libre", MessageSquareText],
                    ["image", "Imagen", ImageIcon],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <Button key={k} type="button" variant={kind === k ? "default" : "outline"} size="sm" onClick={() => setKind(k)}>
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </div>
              {kind !== "template" && (
                <p className="text-xs text-amber-700">
                  Solo llega si esa persona le escribió al número de prueba en las últimas 24 horas (regla de WhatsApp). Para probar: manda cualquier mensaje desde ese celular al +1 555 142 2920.
                </p>
              )}
            </div>

            {kind === "template" && (
              <>
                <div className="space-y-1.5">
                  <Label>Plantilla</Label>
                  <AppSelect
                    value={templateName}
                    onValueChange={(v) => {
                      setTemplateName(v);
                      prefill(v, shipmentId);
                    }}
                    options={WHATSAPP_TEMPLATES.map((t) => ({ value: t.name, label: t.title }))}
                    className="w-full"
                  />
                  {template && !templateApproved && (
                    <p className="text-xs text-amber-700">
                      {metaStatus.has(template.name)
                        ? `Meta todavía no la aprueba (${META_STATUS[metaStatus.get(template.name)!.status]?.label ?? metaStatus.get(template.name)!.status}). Se podrá mandar cuando diga "Aprobada"; presiona "Actualizar" en Plantillas.`
                        : 'No está registrada en Meta. Presiona "Mandar a revisión" en Plantillas.'}
                    </p>
                  )}
                </div>
                {template?.params.map((p, i) => (
                  <div key={p} className="space-y-1.5">
                    <Label htmlFor={`wa-p-${i}`}>{p}</Label>
                    <Input
                      id={`wa-p-${i}`}
                      value={params[i] ?? ""}
                      onChange={(e) => setParams((cur) => template.params.map((_, j) => (j === i ? e.target.value : (cur[j] ?? ""))))}
                    />
                  </div>
                ))}
              </>
            )}

            {kind === "text" && (
              <div className="space-y-1.5">
                <Label htmlFor="wa-text">Mensaje</Label>
                <Textarea id="wa-text" rows={4} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
              </div>
            )}

            {kind === "image" && (
              <div className="space-y-1.5">
                <Label htmlFor="wa-caption">Texto al pie de la imagen</Label>
                <Input id="wa-caption" value={caption} maxLength={300} onChange={(e) => setCaption(e.target.value)} />
                {!shipmentId && <p className="text-muted-foreground text-xs">Elige un embarque para generar su imagen.</p>}
              </div>
            )}

            <Button type="button" onClick={send} disabled={!canSend || sending} className="w-full sm:w-auto">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Mandar por WhatsApp
            </Button>
            {missingVars.length > 0 && <p className="text-muted-foreground text-xs">Falta llenar: {missingVars.join(", ")}.</p>}
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Vista previa</p>
            {kind === "template" && template && <Bubble>{template.builtIn ? template.body : fillTemplate(template.body, params)}</Bubble>}
            {kind === "text" && <Bubble>{text.trim() ? text.toUpperCase() : "Escribe el mensaje."}</Bubble>}
            {kind === "image" &&
              (shipmentId ? (
                <Bubble image={`/api/shipments/${shipmentId}/tracking-image`}>{caption.trim() ? caption.toUpperCase() : undefined}</Bubble>
              ) : (
                <Bubble>Elige un embarque.</Bubble>
              ))}
          </div>
        </div>
      </FormSection>

      {log.length > 0 && (
        <FormSection icon={MessageSquareText} title="Envíos de esta sesión" description="Lo que mandaste desde esta página (no se guarda).">
          <ul className="divide-y rounded-lg border text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.what} → +{l.to}
                  </p>
                  <p className={cn("text-xs", l.ok ? "text-green-700" : "text-destructive")}>{l.detail}</p>
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">{l.at}</span>
              </li>
            ))}
          </ul>
        </FormSection>
      )}
    </div>
  );
}
