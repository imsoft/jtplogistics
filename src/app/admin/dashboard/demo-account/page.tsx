"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const DEMO_EMAIL = "demo@jtp.com.mx";
const DEMO_PASSWORD = "Demo2026";

/** Parte el mensaje para pintar correo y contraseña tal cual, fuera del uppercase. */
const KEEP_CASE_SPLIT = new RegExp(
  `(${[DEMO_EMAIL, DEMO_PASSWORD].map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
);

function getWhatsAppMessage(baseUrl: string): string {
  return `Cuenta demo JTP Logistics

📧 Correo: ${DEMO_EMAIL}
🔑 Contraseña: ${DEMO_PASSWORD}

Ingresa aquí: ${baseUrl}/login`;
}

export default function DemoAccountPage() {
  const [copied, setCopied] = useState(false);
  // El origen solo existe en el navegador. Leerlo al renderizar desfasa
  // servidor y cliente; así React pinta el fijo y lo cambia ya montado.
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://www.jtplogistics.com"
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage(baseUrl));
      setCopied(true);
      toast.success("Copiado. Puedes pegarlo en WhatsApp.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Cuenta demo</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Copia esta información para compartirla con transportistas vía WhatsApp.
        </p>
      </div>
      <Separator />
      <Card className="max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Mensaje para WhatsApp</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Haz clic en «Copiar» y pega el mensaje en tu conversación de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="text-muted-foreground rounded-lg border bg-muted/50 p-4 text-xs sm:text-sm whitespace-pre-wrap font-sans">
            {/* La contraseña y el correo, tal cual: el resto va en mayúsculas. */}
            {getWhatsAppMessage(baseUrl)
              .split(KEEP_CASE_SPLIT)
              .map((part, i) =>
                part === DEMO_PASSWORD ? (
                  <span key={i} className="text-password">{part}</span>
                ) : part === DEMO_EMAIL ? (
                  <span key={i} className="text-email">{part}</span>
                ) : (
                  part
                )
              )}
          </pre>
          <Button onClick={handleCopy} variant="outline" className="gap-2" disabled={copied}>
            <Copy className="size-4" />
            {copied ? "Copiado" : "Copiar mensaje"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
