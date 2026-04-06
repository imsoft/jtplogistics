"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const DEMO_EMAIL = "demo@jtp.com.mx";
const DEMO_PASSWORD = "Demo2026";

function getWhatsAppMessage(): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.jtplogistics.com";
  return `Cuenta demo JTP Logistics

📧 Correo: ${DEMO_EMAIL}
🔑 Contraseña: ${DEMO_PASSWORD}

Ingresa aquí: ${baseUrl}/login`;
}

export default function DemoAccountPage() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage());
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
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
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
            {getWhatsAppMessage()}
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
