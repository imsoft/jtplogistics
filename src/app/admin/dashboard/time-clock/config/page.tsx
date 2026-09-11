"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { FormSkeleton } from "@/components/ui/skeletons";
import { HolidaysCard } from "@/components/dashboard/time-clock/holidays-card";

const MODE_OPTIONS = [
  { value: "off", label: "No revisar la conexión" },
  { value: "flag", label: "Dejar marcar y señalarlo" },
  { value: "block", label: "Solo desde la red de la oficina" },
];

export default function TimeClockConfigPage() {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [mode, setMode] = useState("off");
  const [ips, setIps] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [isReadingIp, setIsReadingIp] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) => {
        setLat(d.time_clock_office_lat ?? "");
        setLng(d.time_clock_office_lng ?? "");
        setRadius(d.time_clock_office_radius_m ?? "150");
        setMode(d.time_clock_network_mode ?? "off");
        setIps((d.time_clock_allowed_ips ?? "").split(/[,\s]+/).filter(Boolean));
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  async function readCurrentIp() {
    setIsReadingIp(true);
    try {
      const res = await fetch("/api/time-clock/whoami");
      const d = (await res.json()) as { ip: string | null };
      setCurrentIp(d.ip);
      if (!d.ip) toast.error("El servidor no pudo determinar tu conexión.");
    } catch {
      toast.error("No se pudo consultar la conexión.");
    } finally {
      setIsReadingIp(false);
    }
  }

  function addCurrentIp() {
    if (!currentIp || ips.includes(currentIp)) return;
    setIps([...ips, currentIp]);
  }

  async function save() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_clock_office_lat: lat.trim(),
          time_clock_office_lng: lng.trim(),
          time_clock_office_radius_m: radius.trim() || "150",
          time_clock_network_mode: mode,
          time_clock_allowed_ips: ips.join(","),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuración del checador guardada.");
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) return <FormSkeleton fields={4} />;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Configuración del checador</h1>
        <p className="text-muted-foreground text-sm">
          Desde dónde se puede marcar asistencia.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Red de la oficina</CardTitle>
          <CardDescription>
            La conexión sí puede impedir marcar, a diferencia de la ubicación: estar
            en el internet de la empresa es algo que se controla, mientras que el GPS
            falla solo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Qué hacer con las conexiones de fuera</Label>
            <AppSelect
              value={mode}
              onValueChange={setMode}
              options={MODE_OPTIONS}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">
              Si la lista de abajo está vacía, nunca se bloquea aunque esté elegida esa
              opción. Es una red de seguridad: una lista mal capturada dejaría a toda la
              empresa sin poder registrar su entrada.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Conexiones autorizadas</Label>
            {ips.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Todavía no hay ninguna. Agrega la de la oficina con el botón de abajo,
                estando conectado ahí.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {ips.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="font-mono text-sm tabular-nums">{ip}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${ip}`}
                      onClick={() => setIps(ips.filter((v) => v !== ip))}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              El internet del edificio puede cambiar de dirección solo. Cuando pase,
              vuelve aquí y agrega la nueva.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={readCurrentIp} disabled={isReadingIp}>
                {isReadingIp ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
                Ver mi conexión actual
              </Button>
              {currentIp && (
                <>
                  <span className="font-mono text-sm tabular-nums">{currentIp}</span>
                  <Button size="sm" onClick={addCurrentIp} disabled={ips.includes(currentIp)}>
                    <Plus className="size-4" />
                    {ips.includes(currentIp) ? "Ya está en la lista" : "Agregar"}
                  </Button>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Es la dirección tal como la ve esta aplicación, que no siempre coincide
              con la que reportan sitios como ifconfig.me. Para autorizar una red hay
              que capturar la que ve la app.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Ubicación de la oficina</CardTitle>
          <CardDescription>
            Sirve para calcular a qué distancia se marcó. Nunca impide marcar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tc-lat">Latitud</Label>
              <Input id="tc-lat" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-lng">Longitud</Label>
              <Input id="tc-lng" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-radius">Radio en metros</Label>
            <Input id="tc-radius" value={radius} onChange={(e) => setRadius(e.target.value)} />
            <p className="text-muted-foreground text-xs">
              150 metros cubre un edificio y su banqueta sin abarcar la cuadra entera.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={isSaving}>
        {isSaving && <Loader2 className="size-4 animate-spin" />}
        {isSaving ? "Guardando…" : "Guardar configuración"}
      </Button>

      <HolidaysCard />
    </div>
  );
}
