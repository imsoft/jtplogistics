"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Mail, NotebookText, Phone, Plus, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { PhoneInput } from "@/components/ui/phone-plates-input";
import { FormSkeleton } from "@/components/ui/skeletons";
import { SAVE_CHANGES, removeItem, useConfirm } from "@/components/ui/confirm-provider";
import { groupContactsByPerson } from "@/lib/contacts";

const PHONE_LABELS = ["Oficina", "Celular", "Casa", "Principal", "Otro"];
const EMAIL_LABELS = ["Principal", "Operaciones", "Cotizaciones", "Ventas", "Otro"];

interface Item {
  value: string;
  label: string;
}
interface Person {
  name: string;
  position: string;
  phones: Item[];
  emails: Item[];
}
interface Company {
  name: string;
  commercialName: string;
  legalName: string;
  rfc: string;
  address: string;
  notes: string;
  contacts: { id: string; type: "phone" | "email"; value: string; label: string | null; position: string | null; personName: string | null }[];
}

const labelOptions = (list: string[], current: string) =>
  [...list, ...(current && !list.includes(current) ? [current] : [])].map((l) => ({ value: l, label: l }));

/**
 * JTP edita los datos de la empresa de un proveedor: razón social, RFC,
 * domicilio, personas de contacto y notas de servicios. El proveedor solo los
 * captura al registrarse (decisión del cliente).
 */
export function CarrierCompanyEditor({ carrierId, backHref }: { carrierId: string; backHref: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loaded, setLoaded] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ commercialName: "", legalName: "", rfc: "", address: "", notes: "" });
  const [persons, setPersons] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/carriers/${carrierId}/company`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Company) => {
        setLoaded(d);
        setForm({ commercialName: d.commercialName, legalName: d.legalName, rfc: d.rfc, address: d.address, notes: d.notes });
        setPersons(
          groupContactsByPerson(d.contacts).map((p) => ({
            name: p.name,
            position: p.position,
            phones: p.contacts.filter((c) => c.type === "phone").map((c) => ({ value: c.value, label: c.label ?? PHONE_LABELS[0] })),
            emails: p.contacts.filter((c) => c.type === "email").map((c) => ({ value: c.value, label: c.label ?? EMAIL_LABELS[0] })),
          }))
        );
      })
      .catch(() => setError("No se pudieron cargar los datos del proveedor."));
  }, [carrierId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const updatePerson = (i: number, patch: Partial<Person>) => setPersons((l) => l.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const updateItem = (i: number, kind: "phones" | "emails", k: number, patch: Partial<Item>) =>
    setPersons((l) => l.map((p, j) => (j === i ? { ...p, [kind]: p[kind].map((it, n) => (n === k ? { ...it, ...patch } : it)) } : p)));

  async function removePerson(i: number) {
    const p = persons[i];
    const hasData = p.name.trim() || [...p.phones, ...p.emails].some((c) => c.value.trim());
    if (hasData && !(await confirm(removeItem(p.name.trim() ? `a ${p.name.trim()}` : "esta persona de contacto")))) return;
    setPersons((l) => l.filter((_, j) => j !== i));
  }
  async function removeContact(i: number, kind: "phones" | "emails", k: number) {
    if (persons[i][kind][k]?.value.trim() && !(await confirm(removeItem(kind === "phones" ? "este teléfono" : "este correo")))) return;
    setPersons((l) => l.map((p, j) => (j === i ? { ...p, [kind]: p[kind].filter((_, n) => n !== k) } : p)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!(await confirm({ ...SAVE_CHANGES, description: "El proveedor verá los datos nuevos en su perfil." }))) return;
    setSaving(true);
    try {
      const contacts = persons.flatMap((p) => [
        ...p.phones.map((c) => ({ type: "phone", value: c.value, label: c.label, position: p.position, personName: p.name })),
        ...p.emails.map((c) => ({ type: "email", value: c.value, label: c.label, position: p.position, personName: p.name })),
      ]);
      const res = await fetch(`/api/admin/carriers/${carrierId}/company`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contacts }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      toast.success("Datos del proveedor guardados.");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!loaded) return <FormSkeleton fields={5} />;

  return (
    <form onSubmit={save} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={Building2} title="Empresa" description="Cómo se llama y dónde está. Sale en tarifarios, contratos y carta porte." className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cc-commercial">Nombre comercial</Label>
          <Input id="cc-commercial" value={form.commercialName} onChange={set("commercialName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-legal">Razón social</Label>
          <Input id="cc-legal" value={form.legalName} onChange={set("legalName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-rfc">RFC</Label>
          <Input id="cc-rfc" value={form.rfc} maxLength={13} onChange={set("rfc")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cc-address">Domicilio fiscal</Label>
          <Textarea id="cc-address" rows={2} value={form.address} onChange={set("address")} />
        </div>
      </FormSection>

      <FormSection
        icon={UsersRound}
        title="Personas de contacto"
        description="Con quién se habla en el proveedor: sus teléfonos y correos."
        aside={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPersons((l) => [...l, { name: "", position: "", phones: [{ value: "", label: PHONE_LABELS[0] }], emails: [{ value: "", label: EMAIL_LABELS[0] }] }])}
          >
            <Plus className="size-4" />
            Agregar persona
          </Button>
        }
        className="space-y-3"
      >
        {persons.length === 0 && <p className="text-muted-foreground text-sm">Sin personas de contacto.</p>}
        {persons.map((p, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-3">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor={`cc-p${i}-name`} className="text-xs">Nombre</Label>
                <Input id={`cc-p${i}-name`} value={p.name} onChange={(e) => updatePerson(i, { name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`cc-p${i}-pos`} className="text-xs">Puesto</Label>
                <Input id={`cc-p${i}-pos`} value={p.position} onChange={(e) => updatePerson(i, { position: e.target.value })} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar persona ${i + 1}`} onClick={() => removePerson(i)}>
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
            {(["phones", "emails"] as const).map((kind) => (
              <div key={kind} className="space-y-2">
                {p[kind].map((it, k) => (
                  <div key={k} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_10rem_auto]">
                    {kind === "phones" ? <Phone className="text-muted-foreground hidden size-4 sm:block" /> : <Mail className="text-muted-foreground hidden size-4 sm:block" />}
                    {kind === "phones" ? (
                      <PhoneInput aria-label={`Teléfono ${k + 1} de ${p.name || `persona ${i + 1}`}`} value={it.value} onChange={(e) => updateItem(i, kind, k, { value: e.target.value })} />
                    ) : (
                      <Input type="email" aria-label={`Correo ${k + 1} de ${p.name || `persona ${i + 1}`}`} value={it.value} onChange={(e) => updateItem(i, kind, k, { value: e.target.value })} />
                    )}
                    <AppSelect value={it.label} onValueChange={(v) => updateItem(i, kind, k, { label: v })} options={labelOptions(kind === "phones" ? PHONE_LABELS : EMAIL_LABELS, it.label)} className="w-full" />
                    <Button type="button" variant="ghost" size="icon" aria-label={kind === "phones" ? "Quitar teléfono" : "Quitar correo"} onClick={() => removeContact(i, kind, k)}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePerson(i, { [kind]: [...p[kind], { value: "", label: (kind === "phones" ? PHONE_LABELS : EMAIL_LABELS)[0] }] })}
                >
                  <Plus className="size-4" />
                  {kind === "phones" ? "Agregar teléfono" : "Agregar correo"}
                </Button>
              </div>
            ))}
          </div>
        ))}
      </FormSection>

      <FormSection icon={NotebookText} title="Notas de servicios" description="Lo que el proveedor ofrece o cobra aparte (estadías, reparto…).">
        <Textarea id="cc-notes" rows={4} aria-label="Notas de servicios" value={form.notes} maxLength={5000} onChange={set("notes")} />
      </FormSection>

      <FormActions sticky submitLabel="Guardar cambios" cancelHref={backHref} isSubmitting={saving} />
    </form>
  );
}
