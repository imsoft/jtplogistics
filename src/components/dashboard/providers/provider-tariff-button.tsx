"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderTariffPdf } from "@/components/dashboard/providers/provider-tariff-pdf";
import type { ProviderTariffRow } from "@/types/provider-tariff.types";

/** Las tarifas se sostienen hasta el cierre del año en curso, como en el machote. */
function defaultValidUntil(): string {
  return `${new Date().getFullYear()}-12-31`;
}

interface TariffRouteInput {
  unitType: string;
  carrierTarget: number | null;
  terms: string | null;
  route: { origin: string; destination: string };
}

interface ProviderTariffButtonProps {
  legalName: string;
  /** Contacto de la ficha: solo precarga el campo, quien cotiza puede cambiarlo. */
  contact: string;
  routes: TariffRouteInput[];
  /** Catálogo de tipos de unidad, para imprimir la etiqueta y no el valor. */
  unitTypes: { value: string; label: string }[];
}

export function ProviderTariffButton({
  legalName,
  contact,
  routes,
  unitTypes,
}: ProviderTariffButtonProps) {
  const [open, setOpen] = useState(false);
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  // Quien firma por el proveedor lo anota pricing al generar el documento.
  const [contactName, setContactName] = useState(contact);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin target no hay tarifa que imprimir: esas rutas quedan fuera del documento.
  const rows: ProviderTariffRow[] = routes
    .filter((r) => r.carrierTarget != null)
    .map((r) => ({
      origin: r.route.origin,
      destination: r.route.destination,
      cost: r.carrierTarget as number,
      unitLabel: unitTypes.find((u) => u.value === r.unitType)?.label ?? r.unitType,
      terms: r.terms,
    }));

  const skipped = routes.length - rows.length;

  async function handleDownload() {
    setError(null);
    if (rows.length === 0) {
      setError("Este proveedor no tiene ninguna ruta con target capturado.");
      return;
    }
    if (!contactName.trim()) {
      setError("Anota el nombre del contacto que firma por el proveedor.");
      return;
    }
    setIsGenerating(true);
    try {
      let termsJson = "";
      try {
        const res = await fetch("/api/quote-config");
        if (res.ok) {
          const cfg = await res.json() as { tariffTermsJson?: string };
          termsJson = cfg.tariffTermsJson ?? "";
        }
      } catch (e) {
        console.error("No se pudieron cargar las cláusulas del tarifario:", e);
      }

      let issuer: { name?: string; position?: string } = {};
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const me = await res.json() as { name?: string; position?: string | null };
          issuer = { name: me.name, position: me.position ?? undefined };
        }
      } catch (e) {
        console.error("No se pudo cargar el perfil de quien emite:", e);
      }

      const blob = await pdf(
        <ProviderTariffPdf
          data={{ legalName, contact: contactName.trim(), validUntil, rows }}
          logoUrl={window.location.origin + "/images/logo/jtp-logistics.png"}
          termsJson={termsJson}
          issuerName={issuer.name}
          issuerPosition={issuer.position}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tarifario-${legalName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setOpen(false);
    } catch (e) {
      console.error("Error al generar el tarifario:", e);
      setError(
        `No se pudo generar el tarifario: ${e instanceof Error ? e.message : "error desconocido"}`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="size-4" />
          Descargar tarifario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarifario de {legalName}</DialogTitle>
          <DialogDescription>
            Se genera el acuerdo comercial con las rutas que este proveedor tiene cotizadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="tariff-contact">Contacto del proveedor</Label>
          <Input
            id="tariff-contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Quien firma el acuerdo por parte del proveedor. Se precarga con el
            contacto de su ficha.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tariff-valid-until">Vigencia</Label>
          <DatePicker
            id="tariff-valid-until"
            value={validUntil}
            onChange={setValidUntil}
          />
          <p className="text-xs text-muted-foreground">
            Hasta cuándo se sostienen las tarifas del documento.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {rows.length === 1 ? "Se incluirá 1 ruta." : `Se incluirán ${rows.length} rutas.`}
          {skipped > 0 &&
            ` ${skipped === 1 ? "1 ruta queda fuera" : `${skipped} rutas quedan fuera`} por no tener target capturado.`}
        </p>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
