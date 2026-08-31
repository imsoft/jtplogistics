"use client";

import { useState, useEffect } from "react";
import { Plus, X, Phone, Mail, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfile } from "@/hooks/use-profile";
import { FormSkeleton } from "@/components/ui/skeletons";

const PHONE_LABELS = ["Oficina", "Celular", "Casa", "Principal", "Otro"] as const;
const EMAIL_LABELS = ["Principal", "Operaciones", "Cotizaciones", "Ventas", "Otro"] as const;

interface PersonContactItem {
  value: string;
  label: string;
}

/** Persona de contacto: agrupa sus teléfonos y correos. */
interface PersonInput {
  name: string;
  position: string;
  phones: PersonContactItem[];
  emails: PersonContactItem[];
}

interface FlatContact {
  type: "phone" | "email";
  value: string;
  label: string;
  position: string;
  personName: string;
}

interface FormState {
  name: string;
  email: string;
  birthDate: string;
  commercialName: string;
  legalName: string;
  rfc: string;
  address: string;
  notes: string;
  persons: PersonInput[];
}

const DEFAULT_NOTES = "- Estadías\n- Reparto";

/**
 * Agrupa los contactos planos en personas. Los contactos guardados antes de
 * existir "persona" (sin personName) se agrupan por puesto.
 */
function groupContactsByPerson(contacts: FlatContact[]): PersonInput[] {
  const map = new Map<string, PersonInput>();
  for (const c of contacts) {
    const key = `${c.personName.trim().toLowerCase()}||${c.position.trim().toLowerCase()}`;
    let person = map.get(key);
    if (!person) {
      person = { name: c.personName.trim(), position: c.position.trim(), phones: [], emails: [] };
      map.set(key, person);
    }
    const item = { value: c.value, label: c.label };
    if (c.type === "phone") person.phones.push(item);
    else person.emails.push(item);
  }
  return Array.from(map.values());
}

function flattenPersons(persons: PersonInput[]): FlatContact[] {
  return persons.flatMap((p) => [
    ...p.phones
      .filter((ph) => ph.value.trim())
      .map((ph) => ({
        type: "phone" as const,
        value: ph.value.trim(),
        label: ph.label,
        position: p.position.trim(),
        personName: p.name.trim(),
      })),
    ...p.emails
      .filter((em) => em.value.trim())
      .map((em) => ({
        type: "email" as const,
        value: em.value.trim(),
        label: em.label,
        position: p.position.trim(),
        personName: p.name.trim(),
      })),
  ]);
}

export default function CarrierProfilePage() {
  const { data, isFetching, fetchError } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  /** Índice de la persona abierta en el modal (null = cerrado). */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    birthDate: "",
    commercialName: "",
    legalName: "",
    rfc: "",
    address: "",
    notes: DEFAULT_NOTES,
    persons: [],
  });

  useEffect(() => {
    async function loadNotes() {
      const res = await fetch("/api/carrier/notes");
      if (res.ok) {
        const { notes } = await res.json() as { notes: string };
        setForm((prev) => ({ ...prev, notes: notes ?? DEFAULT_NOTES }));
      }
    }
    if (data) {
      setForm((prev) => ({
        ...prev,
        name: data.name,
        email: data.email,
        birthDate: data.birthDate ?? "",
        commercialName: data.commercialName,
        legalName: data.legalName,
        rfc: data.rfc,
        address: data.address,
        persons: groupContactsByPerson(
          data.contacts.map((c) => ({
            type: c.type,
            value: c.value,
            label: c.label ?? "",
            position: c.position ?? "",
            personName: c.personName ?? "",
          }))
        ),
      }));
      void loadNotes();
    }
  }, [data]);

  function field<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function addPerson() {
    setForm((prev) => ({
      ...prev,
      persons: [
        ...prev.persons,
        { name: "", position: "", phones: [{ value: "", label: PHONE_LABELS[0] }], emails: [{ value: "", label: EMAIL_LABELS[0] }] },
      ],
    }));
    setEditingIndex(form.persons.length);
  }

  function removePerson(idx: number) {
    setForm((prev) => ({
      ...prev,
      persons: prev.persons.filter((_, i) => i !== idx),
    }));
    setEditingIndex(null);
  }

  function updatePerson(idx: number, patch: Partial<PersonInput>) {
    setForm((prev) => {
      const persons = [...prev.persons];
      persons[idx] = { ...persons[idx], ...patch };
      return { ...prev, persons };
    });
  }

  function updatePersonContact(
    idx: number,
    kind: "phones" | "emails",
    itemIdx: number,
    patch: Partial<PersonContactItem>
  ) {
    setForm((prev) => {
      const persons = [...prev.persons];
      const items = [...persons[idx][kind]];
      items[itemIdx] = { ...items[itemIdx], ...patch };
      persons[idx] = { ...persons[idx], [kind]: items };
      return { ...prev, persons };
    });
  }

  function addPersonContact(idx: number, kind: "phones" | "emails") {
    setForm((prev) => {
      const persons = [...prev.persons];
      const defaultLabel = kind === "phones" ? PHONE_LABELS[0] : EMAIL_LABELS[0];
      persons[idx] = {
        ...persons[idx],
        [kind]: [...persons[idx][kind], { value: "", label: defaultLabel }],
      };
      return { ...prev, persons };
    });
  }

  function removePersonContact(idx: number, kind: "phones" | "emails", itemIdx: number) {
    setForm((prev) => {
      const persons = [...prev.persons];
      persons[idx] = {
        ...persons[idx],
        [kind]: persons[idx][kind].filter((_, i) => i !== itemIdx),
      };
      return { ...prev, persons };
    });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const [profileRes, notesRes] = await Promise.all([
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            birthDate: form.birthDate || null,
            commercialName: form.commercialName.trim() || null,
            legalName: form.legalName.trim() || null,
            rfc: form.rfc.trim() || null,
            address: form.address.trim() || null,
            contacts: flattenPersons(form.persons).map((c) => ({
              type: c.type,
              value: c.value,
              label: c.label.trim() || null,
              position: c.position || null,
              personName: c.personName || null,
            })),
          }),
        }),
        fetch("/api/carrier/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: form.notes }),
        }),
      ]);
      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }
      if (!notesRes.ok) {
        const err = await notesRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar notas");
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
        <FormSkeleton fields={4} />
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

  const editingPerson = editingIndex != null ? form.persons[editingIndex] : null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Mi perfil</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Actualiza tu información de contacto y datos de empresa.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Perfil guardado correctamente.</p>}

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
              <DatePicker
                id="birthDate"
                disabled={isLoading}
                value={form.birthDate}
                onChange={(value) => setForm((prev) => ({ ...prev, birthDate: value }))}
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

        {/* ── Personas de contacto ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5" /> Personas de contacto
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addPerson} disabled={isLoading}>
              <Plus className="size-3.5" /> Agregar persona
            </Button>
          </div>

          {form.persons.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No hay personas de contacto registradas.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {form.persons.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEditingIndex(i)}
                  className="rounded-lg border p-4 text-left transition-colors hover:bg-hover hover:text-hover-foreground"
                >
                  <p className="font-semibold text-sm">{p.position.trim() || "Sin puesto"}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {p.name.trim() || "Sin nombre"}
                  </p>
                  <p className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> {p.phones.filter((x) => x.value.trim()).length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" /> {p.emails.filter((x) => x.value.trim()).length}
                    </span>
                  </p>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Haz clic en una persona para ver y editar toda su información.
          </p>
        </section>

        {/* ── Notas de servicios ── */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notas de servicios
          </h2>
          <Textarea
            id="notes"
            rows={5}
            disabled={isLoading}
            value={form.notes}
            onChange={field("notes")}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            Describe los servicios que ofreces. Esta información es visible para el administrador.
          </p>
        </section>

        {/* ── Footer ── */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {/* ── Modal: toda la información de la persona ── */}
      <Dialog open={editingIndex != null} onOpenChange={(open) => { if (!open) setEditingIndex(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {editingPerson && editingIndex != null && (
            <>
              <DialogHeader>
                <DialogTitle>{editingPerson.position.trim() || "Persona de contacto"}</DialogTitle>
                <DialogDescription>
                  Información completa de la persona. Los cambios se aplican al guardar el perfil.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="person-position">Puesto</Label>
                    <Input
                      id="person-position"
                      placeholder="Ej. Gerente de operaciones"
                      value={editingPerson.position}
                      onChange={(e) => updatePerson(editingIndex, { position: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="person-name">Nombre</Label>
                    <Input
                      id="person-name"
                      placeholder="Nombre de la persona"
                      value={editingPerson.name}
                      onChange={(e) => updatePerson(editingIndex, { name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Teléfonos de la persona */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="size-3.5" /> Teléfonos
                    </Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addPersonContact(editingIndex, "phones")}>
                      <Plus className="size-3.5" /> Agregar
                    </Button>
                  </div>
                  {editingPerson.phones.length === 0 && (
                    <p className="text-muted-foreground text-xs">Sin teléfonos.</p>
                  )}
                  {editingPerson.phones.map((ph, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input
                        type="tel"
                        placeholder="Teléfono"
                        value={ph.value}
                        onChange={(e) => updatePersonContact(editingIndex, "phones", j, { value: e.target.value })}
                        className="flex-1 min-w-0"
                      />
                      <AppSelect
                        value={ph.label || PHONE_LABELS[0]}
                        onValueChange={(val) => updatePersonContact(editingIndex, "phones", j, { label: val })}
                        options={PHONE_LABELS.map((l) => ({ value: l, label: l }))}
                        className="w-28 shrink-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removePersonContact(editingIndex, "phones", j)}
                        aria-label="Eliminar teléfono"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Correos de la persona */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Mail className="size-3.5" /> Correos
                    </Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addPersonContact(editingIndex, "emails")}>
                      <Plus className="size-3.5" /> Agregar
                    </Button>
                  </div>
                  {editingPerson.emails.length === 0 && (
                    <p className="text-muted-foreground text-xs">Sin correos.</p>
                  )}
                  {editingPerson.emails.map((em, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="Correo"
                        value={em.value}
                        onChange={(e) => updatePersonContact(editingIndex, "emails", j, { value: e.target.value })}
                        className="flex-1 min-w-0"
                      />
                      <AppSelect
                        value={em.label || EMAIL_LABELS[0]}
                        onValueChange={(val) => updatePersonContact(editingIndex, "emails", j, { label: val })}
                        options={EMAIL_LABELS.map((l) => ({ value: l, label: l }))}
                        className="w-28 shrink-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removePersonContact(editingIndex, "emails", j)}
                        aria-label="Eliminar correo"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {flattenPersons([editingPerson]).length === 0 && (
                  <p className="text-xs text-amber-600">
                    Agrega al menos un teléfono o correo; de lo contrario esta persona no se guardará.
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removePerson(editingIndex)}
                >
                  <Trash2 className="size-4" /> Eliminar persona
                </Button>
                <Button type="button" onClick={() => setEditingIndex(null)}>
                  Listo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
