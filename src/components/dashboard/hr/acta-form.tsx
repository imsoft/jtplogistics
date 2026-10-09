"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import {
  ACTA_AREAS,
  actaFilename,
  emptyActa,
  validateActa,
  type ActaData,
  type ActaErrors,
} from "@/lib/acta-administrativa";

interface EmployeeOption {
  id: string;
  name: string;
  position: string | null;
}

const AREA_OPTIONS = ACTA_AREAS.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }));

function nowKeys() {
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", ...o }).format(new Date());
  return {
    today: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }),
    time: fmt({ hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id?: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs font-medium">{error}</p>
      ) : help ? (
        <p className="text-muted-foreground text-xs">{help}</p>
      ) : null}
    </div>
  );
}

/**
 * Formulario del acta administrativa. Cada campo es una de las zonas que en el
 * machote de RH iban en amarillo; el texto fijo lo pone el PDF. No se guarda
 * nada: se arma el PDF en el navegador y se descarga.
 */
export function ActaForm({
  responsibleName,
  employeesEndpoint,
}: {
  responsibleName: string;
  employeesEndpoint: string;
}) {
  const params = useSearchParams();
  const initial = useMemo(() => {
    const { today, time } = nowKeys();
    return emptyActa(today, time, responsibleName);
  }, [responsibleName]);

  const [data, setData] = useState<ActaData>(initial);
  const [employeeId, setEmployeeId] = useState(params.get("employeeId") ?? "");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [errors, setErrors] = useState<ActaErrors>({});
  const [busy, setBusy] = useState(false);

  /** Llena nombre y puesto del colaborador elegido; luego se pueden corregir. */
  function fillFrom(rows: EmployeeOption[], id: string) {
    const e = rows.find((x) => x.id === id);
    if (e) setData((d) => ({ ...d, employeeName: e.name, employeePosition: e.position ?? "" }));
  }

  useEffect(() => {
    const preselected = params.get("employeeId") ?? "";
    fetch(employeesEndpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: EmployeeOption[]) => {
        setEmployees(rows);
        // Si se llegó desde la ficha del colaborador, ya viene elegido.
        fillFrom(rows, preselected);
      })
      .catch(() => setEmployees([]));
  }, [employeesEndpoint, params]);

  function chooseEmployee(id: string) {
    setEmployeeId(id);
    fillFrom(employees, id);
  }

  const set = <K extends keyof ActaData>(key: K) => (value: ActaData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const text = (key: keyof ActaData) => ({
    value: data[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key)(e.target.value as never),
  });

  async function generate() {
    const found = validateActa(data);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Faltan datos del acta. Revisa los campos marcados.");
      return;
    }
    setBusy(true);
    try {
      const [{ pdf }, { ActaPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/dashboard/hr/acta-pdf"),
      ]);
      const blob = await pdf(
        <ActaPdf data={data} logoUrl={`${window.location.origin}/images/logo/jtp-logistics.png`} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = actaFilename(data);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[acta] PDF", e);
      toast.error("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del acta</CardTitle>
          <CardDescription>Cuándo se levanta y quién la levanta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field id="a-date" label="Fecha" error={errors.date}>
            <Input id="a-date" type="date" {...text("date")} />
          </Field>
          <Field id="a-start" label="Hora de inicio" error={errors.startTime}>
            <Input id="a-start" type="time" {...text("startTime")} />
          </Field>
          <Field id="a-end" label="Hora de cierre" help="Vacía: queda la línea para escribirla a mano." error={errors.endTime}>
            <Input id="a-end" type="time" {...text("endTime")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="a-resp" label="Quién levanta el acta" error={errors.responsibleName}>
              <Input id="a-resp" {...text("responsibleName")} />
            </Field>
          </div>
          <Field id="a-title" label="Su puesto">
            <Input id="a-title" {...text("responsibleTitle")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colaborador</CardTitle>
          <CardDescription>Al elegirlo se llenan su nombre y su puesto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Colaborador">
              <AppSelect
                value={employeeId}
                onValueChange={chooseEmployee}
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                className="w-full"
              />
            </Field>
          </div>
          <Field id="a-emp" label="Nombre" error={errors.employeeName}>
            <Input id="a-emp" {...text("employeeName")} />
          </Field>
          <Field id="a-pos" label="Puesto" error={errors.employeePosition}>
            <Input id="a-pos" {...text("employeePosition")} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="a-duties"
              label="Funciones del puesto (antecedentes)"
              help="Completa la frase: «el colaborador desempeña funciones …». Viene la del machote; ajústala al puesto."
            >
              <Textarea id="a-duties" rows={3} {...text("duties")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hechos</CardTitle>
          <CardDescription>Qué pasó y qué respondió el colaborador.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="a-idate" label="Fecha de los hechos" error={errors.incidentDate}>
            <Input id="a-idate" type="date" {...text("incidentDate")} />
          </Field>
          <Field id="a-mdate" label="Fecha de la reunión" help="En la que se le pidió que explicara.">
            <Input id="a-mdate" type="date" {...text("meetingDate")} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="a-desc"
              label="Qué omitió"
              help="Completa la frase: «el colaborador omitió …». Escríbelo con mayúsculas y minúsculas normales: los nombres propios (Querétaro, ECO 4521) salen tal como los escribas. Si lo escribes todo en mayúsculas, el acta lo pasa a minúsculas."
              error={errors.incidentDescription}
            >
              <Textarea id="a-desc" rows={4} {...text("incidentDescription")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="a-resp2" label="Su respuesta en la reunión" help="Completa la frase: «su respuesta fue que …». Opcional.">
              <Textarea id="a-resp2" rows={2} {...text("employeeResponse")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              id="a-breach"
              label="En qué incumplió sus funciones"
              help="Completa la frase: «Omitió …, cumplir con los protocolos laborales…»."
              error={errors.breach}
            >
              <Textarea id="a-breach" rows={2} {...text("breach")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manifestación, determinación y testigos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              id="a-stmt"
              label="Manifestación del colaborador"
              help="Si se deja vacía, el PDF deja renglones para que la escriba de su puño y letra al firmar."
            >
              <Textarea id="a-stmt" rows={4} {...text("statement")} />
            </Field>
          </div>
          <Field label="Documentación a evaluar" help="El área a la que se refieren los hechos.">
            <AppSelect
              value={data.area}
              onValueChange={(v) => set("area")((ACTA_AREAS as readonly string[]).includes(v) ? (v as ActaData["area"]) : "operativa")}
              options={AREA_OPTIONS}
              className="w-full"
            />
          </Field>
          <div />
          <Field id="a-w1" label="Testigo 1" help="Vacío: queda la línea para el nombre.">
            <Input id="a-w1" {...text("witness1")} />
          </Field>
          <Field id="a-w2" label="Testigo 2" help="Vacío: queda la línea para el nombre.">
            <Input id="a-w2" {...text("witness2")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={generate} disabled={busy} size="lg">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Generar PDF
        </Button>
      </div>
    </div>
  );
}
