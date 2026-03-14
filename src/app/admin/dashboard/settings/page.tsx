"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => {
        const raw = data.jtp_whatsapp ?? "";
        const digits = raw.replace(/\D/g, "");
        setWhatsapp(digits.startsWith("52") && digits.length === 12 ? digits.slice(2) : digits);
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  function toFullNumber(digits: string): string {
    const d = digits.replace(/\D/g, "");
    if (d.length === 10) return `52${d}`;
    if (d.length === 12 && d.startsWith("52")) return d;
    return d;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const full = toFullNumber(whatsapp.trim());
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtp_whatsapp: full }),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuración guardada correctamente.");
    } catch {
      toast.error("No se pudo guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) return <p className="text-muted-foreground text-sm">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Ajustes generales de la plataforma.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">WhatsApp de contacto</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Número que se muestra a los transportistas como botón de contacto en su panel de rutas.
            Solo los 10 dígitos mexicanos — el prefijo +52 se agrega automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número de WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-muted-foreground text-xs">
                El botón solo aparece cuando hay un número configurado.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
