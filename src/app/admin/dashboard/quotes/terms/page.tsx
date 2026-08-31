"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LexicalEditor } from "@/components/ui/lexical-editor";
import { FormSkeleton } from "@/components/ui/skeletons";

interface QuoteConfig {
  bulletsJson: string;
  contractJson: string;
  privacyJson: string;
  limitsJson: string;
  tariffTermsJson: string;
}

type Section = keyof QuoteConfig;

const SECTIONS: { key: Section; label: string; description: string }[] = [
  { key: "bulletsJson",  label: "Viñetas T&C",      description: "Términos y condiciones en viñetas (página 1 de la cotización)" },
  { key: "contractJson", label: "Contrato",           description: "Términos insertos en el contrato (página 2)" },
  { key: "privacyJson",  label: "Aviso de privacidad", description: "Aviso de privacidad (página 3)" },
  { key: "limitsJson",   label: "Responsabilidad",    description: "Límites de responsabilidad y restricción (página 4)" },
  { key: "tariffTermsJson", label: "Tarifario proveedores", description: "Cláusulas del tarifario que se descarga por proveedor" },
];

export default function QuoteTermsPage() {
  const [config, setConfig] = useState<QuoteConfig | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("bulletsJson");
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/quote-config");
    if (!res.ok) return;
    const data: QuoteConfig = await res.json();
    setConfig(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(key: Section, json: string) {
    setConfig((prev) => prev ? { ...prev, [key]: json } : prev);
  }

  async function handleSave() {
    if (!config) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/quote-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const d = await res.json() as { updatedAt: string };
      setSavedAt(new Date(d.updatedAt).toLocaleTimeString("es-MX"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="min-w-0 space-y-4">
        <h1 className="page-heading">Textos legales</h1>
        <FormSkeleton fields={2} />
      </div>
    );
  }

  const current = SECTIONS.find((s) => s.key === activeSection)!;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/quotes" aria-label="Volver al cotizador">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading">Textos legales de cotización</h1>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Edita el contenido que aparece en cada página del PDF.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {savedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Guardado a las {savedAt}
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tab nav */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeSection === s.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Active editor */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{current.description}</p>
        <LexicalEditor
          key={activeSection}
          value={config[activeSection]}
          onChange={(json) => handleChange(activeSection, json)}
          minHeight={480}
        />
      </div>
    </div>
  );
}
