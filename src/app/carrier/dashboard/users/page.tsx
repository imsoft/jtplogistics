"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, UserPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CARRIER_MEMBER_PERMISSIONS,
  type CarrierMemberPermissionKey,
} from "@/lib/carrier-permissions";

type Perms = Record<CarrierMemberPermissionKey, boolean>;

interface Member extends Perms {
  id: string;
  name: string;
  email: string;
  memberRevokedAt: string | null;
}

const NO_PERMS = Object.fromEntries(
  CARRIER_MEMBER_PERMISSIONS.map((p) => [p.key, false])
) as Perms;

/**
 * Los usuarios de la empresa. Solo la ve el usuario principal: administrar
 * usuarios no se delega. JTP ve esta misma lista, sin poder cambiarla.
 */
export default function CarrierUsersPage() {
  const [isPrincipal, setIsPrincipal] = useState<boolean | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<Perms>(NO_PERMS);
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Member | null>(null);
  const [pendingPassword, setPendingPassword] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    fetch("/api/carrier/members")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { members: Member[] }) => setMembers(d.members))
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    fetch("/api/carrier/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { isPrincipal: boolean } | null) => {
        setIsPrincipal(d?.isPrincipal ?? false);
        if (d?.isPrincipal) load();
      })
      .catch(() => setIsPrincipal(false));
  }, [load]);

  async function add() {
    setIsAdding(true);
    try {
      const res = await fetch("/api/carrier/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), ...perms }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailed?: boolean;
        password?: string | null;
      };
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo dar de alta.");
        return;
      }
      if (d.emailed) {
        toast.success(`Listo. Le llegó un correo a ${email.trim()} con su acceso.`);
      } else if (d.password) {
        // Ya tiene cuenta: sin esto quedaría fuera.
        setPendingPassword({ email: email.trim(), password: d.password });
      }
      setName("");
      setEmail("");
      setPerms(NO_PERMS);
      load();
    } finally {
      setIsAdding(false);
    }
  }

  async function toggle(member: Member, key: CarrierMemberPermissionKey, value: boolean) {
    setBusyId(member.id);
    // Capturar tarifas incluye verlas: apagar "ver" apaga también "capturar".
    const patch: Partial<Perms> = { [key]: value };
    if (key === "memberCanEditRates" && value) patch.memberCanViewRates = true;
    if (key === "memberCanViewRates" && !value) patch.memberCanEditRates = false;
    try {
      const res = await fetch(`/api/carrier/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "No se pudo cambiar el permiso.");
        return;
      }
      setMembers((prev) => prev?.map((m) => (m.id === member.id ? { ...m, ...patch } : m)) ?? prev);
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(member: Member) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/carrier/members/${member.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo quitar el acceso.");
        return;
      }
      toast.success(`${member.name} ya no puede entrar.`);
      load();
    } finally {
      setBusyId(null);
      setRevoking(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  if (isPrincipal === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isPrincipal) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Los usuarios de la empresa los administra el usuario principal.
      </p>
    );
  }

  const active = members?.filter((m) => !m.memberRevokedAt) ?? [];
  const revoked = members?.filter((m) => m.memberRevokedAt) ?? [];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Da acceso a gente de tu empresa y decide qué puede hacer cada quien. Todo lo
          que hagan queda a nombre de tu empresa y con su nombre en el registro.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dar acceso</CardTitle>
          <CardDescription>
            Le llega un correo con una contraseña temporal para entrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-name">Nombre</Label>
              <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-email">Correo</Label>
              <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Qué puede hacer</p>
            {CARRIER_MEMBER_PERMISSIONS.map((p) => (
              <div key={p.key} className="flex items-start gap-2">
                <Checkbox
                  id={`new-${p.key}`}
                  checked={perms[p.key]}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setPerms((prev) => ({
                      ...prev,
                      [p.key]: on,
                      ...(p.key === "memberCanEditRates" && on ? { memberCanViewRates: true } : {}),
                      ...(p.key === "memberCanViewRates" && !on ? { memberCanEditRates: false } : {}),
                    }));
                  }}
                />
                <Label htmlFor={`new-${p.key}`} className="flex flex-col gap-0.5 font-normal">
                  <span>{p.label}</span>
                  <span className="text-muted-foreground text-xs">{p.hint}</span>
                </Label>
              </div>
            ))}
          </div>
          <Button onClick={add} disabled={isAdding || !name.trim() || !email.trim()}>
            {isAdding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Dar acceso
          </Button>
        </CardContent>
      </Card>

      {pendingPassword && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-destructive text-sm font-medium">
              La cuenta de {pendingPassword.email} quedó creada, pero el correo no salió.
              Pásale esta contraseña por otro medio o no va a poder entrar:
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <code className="flex-1 break-all text-base font-bold">{pendingPassword.password}</code>
              <Button variant="ghost" size="icon" aria-label="Copiar contraseña" onClick={() => copy(pendingPassword.password)}>
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPendingPassword(null)}>
              Ya se la pasé
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Con acceso ({active.length})</h2>
        {members === null ? (
          <Skeleton className="h-24 w-full" />
        ) : active.length === 0 ? (
          <p className="text-muted-foreground text-sm">Por ahora solo entras tú.</p>
        ) : (
          active.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-email text-muted-foreground text-xs">{m.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setRevoking(m)} disabled={busyId === m.id}>
                    <UserX className="size-4" />
                    Quitar acceso
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CARRIER_MEMBER_PERMISSIONS.map((p) => (
                    <div key={p.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`${m.id}-${p.key}`}
                        checked={m[p.key]}
                        disabled={busyId === m.id}
                        onCheckedChange={(v) => toggle(m, p.key, v === true)}
                      />
                      <Label htmlFor={`${m.id}-${p.key}`} className="text-sm font-normal">
                        {p.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {revoked.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-semibold">Sin acceso ({revoked.length})</h2>
          <p className="text-muted-foreground text-xs">
            Siguen apareciendo en los mensajes que escribieron. Para devolverles el acceso,
            dalos de alta otra vez con el mismo correo.
          </p>
          <div className="rounded-lg border">
            {revoked.map((m) => (
              <div key={m.id} className="border-b px-4 py-2.5 text-sm last:border-0">
                <span className="font-medium">{m.name}</span>{" "}
                <span className="text-email text-muted-foreground">{m.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitarle el acceso a {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no va a poder entrar y se le cierra la sesión en este momento. Lo que
              escribió en los mensajes se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => revoking && revoke(revoking)}>
              Quitar acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
