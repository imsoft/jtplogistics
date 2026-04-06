"use client";

import { useState, useEffect } from "react";
import { Plus, X, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useProfile } from "@/hooks/use-profile";

const PHONE_LABELS = ["Oficina", "Celular", "Casa", "Principal", "Otro"] as const;
const EMAIL_LABELS = ["Principal", "Operaciones", "Cotizaciones", "Ventas", "Otro"] as const;

interface ContactInput {
  id?: string;
  type: "phone" | "email";
  value: string;
  label: string;
}

interface FormState {
  name: string;
  email: string;
  birthDate: string;
  commercialName: string;
  legalName: string;
  rfc: string;
  address: string;
  contacts: ContactInput[];
}

export default function CarrierProfilePage() {
  const { data, isFetching, fetchError } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    birthDate: "",
    commercialName: "",
    legalName: "",
    rfc: "",
    address: "",
    contacts: [],
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        email: data.email,
        birthDate: data.birthDate ?? "",
        commercialName: data.commercialName,
        legalName: data.legalName,
        rfc: data.rfc,
        address: data.address,
        contacts: data.contacts.map((c) => ({
          id: c.id,
          type: c.type,
          value: c.value,
          label: c.label ?? "",
        })),
      });
    }
  }, [data]);

  function field<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function addContact(type: "phone" | "email") {
    setForm((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { type, value: "", label: "" }],
    }));
  }

  function removeContact(idx: number) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx),
    }));
  }

  function updateContact(idx: number, key: "value" | "label", val: string) {
    setForm((prev) => {
      const contacts = [...prev.contacts];
      contacts[idx] = { ...contacts[idx], [key]: val };
      return { ...prev, contacts };
    });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          birthDate: form.birthDate || null,
          commercialName: form.commercialName.trim() || null,
          legalName: form.legalName.trim() || null,
          rfc: form.rfc.trim() || null,
          address: form.address.trim() || null,
          contacts: form.contacts
            .filter((c) => c.value.trim())
            .map((c) => ({ type: c.type, value: c.value.trim(), label: c.label.trim() || null })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="min-w-0 space-y-4">
        <h1 className="page-heading">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-w-0 space-y-4">
        <h1 className="page-heading">Mi perfil</h1>
        <p className="text-sm text-destructive">{fetchError}</p>
      </div>
    );
  }

  const phones = form.contacts.map((c, i) => ({ ...c, idx: i })).filter((c) => c.type === "phone");
  const emails = form.contacts.map((c, i) => ({ ...c, idx: i })).filter((c) => c.type === "email");

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Mi perfil</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Actualiza tu información de contacto y datos de empresa.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">Perfil guardado correctamente.</p>}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Foto de perfil ── */}
        <section className="flex items-center gap-4">
          <AvatarUpload
            currentImage={data?.image ?? null}
            name={data?.name ?? ""}
            endpoint="/api/profile/avatar"
            size={72}
          />
          <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
        </section>

        {/* ── Datos personales ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Datos personales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" required disabled={isLoading} value={form.name} onChange={field("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo de acceso</Label>
              <Input id="email" type="email" disabled value={form.email} className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                disabled={isLoading}
                value={form.birthDate}
                onChange={field("birthDate")}
              />
            </div>
          </div>
        </section>

        {/* ── Datos de empresa ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Datos de empresa
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commercialName">Nombre comercial</Label>
              <Input id="commercialName" disabled={isLoading} value={form.commercialName} onChange={field("commercialName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Razón social</Label>
              <Input id="legalName" disabled={isLoading} value={form.legalName} onChange={field("legalName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                disabled={isLoading}
                value={form.rfc}
                onChange={field("rfc")}
                className="uppercase"
                maxLength={13}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              rows={2}
              className="resize-none"
              disabled={isLoading}
              value={form.address}
              onChange={field("address")}
            />
          </div>
        </section>

        {/* ── Teléfonos ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" /> Teléfonos
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => addContact("phone")} disabled={isLoading}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          </div>

          {phones.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No hay teléfonos registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {phones.map((c) => (
                <div key={c.idx} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="tel"
                    value={c.value}
                    onChange={(e) => updateContact(c.idx, "value", e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Select
                    value={c.label || PHONE_LABELS[0]}
                    onValueChange={(val) => updateContact(c.idx, "label", val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-28 shrink-0 sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_LABELS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeContact(c.idx)}
                    disabled={isLoading}
                    aria-label="Eliminar teléfono"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Correos ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3.5" /> Correos de contacto
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => addContact("email")} disabled={isLoading}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          </div>

          {emails.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No hay correos de contacto registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {emails.map((c) => (
                <div key={c.idx} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="email"
                    value={c.value}
                    onChange={(e) => updateContact(c.idx, "value", e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Select
                    value={c.label || EMAIL_LABELS[0]}
                    onValueChange={(val) => updateContact(c.idx, "label", val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-28 shrink-0 sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_LABELS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeContact(c.idx)}
                    disabled={isLoading}
                    aria-label="Eliminar correo"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
