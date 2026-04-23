"use client";

import { useState, useEffect, useMemo } from "react";

interface OrgEmployee {
  id: string;
  name: string;
  image: string | null;
  position: string | null;
  department: string | null;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
}

function EmployeeCard({ emp }: { emp: OrgEmployee }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card px-3 py-3 w-[148px] shadow-sm transition-shadow hover:shadow-md">
      {emp.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.image}
          alt={emp.name}
          className="size-12 rounded-full object-cover ring-2 ring-border"
        />
      ) : (
        <div className="size-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground ring-2 ring-border">
          {initials(emp.name)}
        </div>
      )}
      <p className="text-xs font-semibold text-center leading-tight line-clamp-2 w-full">{emp.name}</p>
      {emp.position ? (
        <p className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">
          {emp.position}
        </p>
      ) : null}
    </div>
  );
}

interface TeamOrgChartProps {
  apiEndpoint: string;
  companyName?: string;
}

export function TeamOrgChart({ apiEndpoint, companyName = "JTP Logistics" }: TeamOrgChartProps) {
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiEndpoint)
      .then((r) => {
        if (r.status === 403) throw new Error("Sin permiso para ver este recurso.");
        if (!r.ok) throw new Error("Error al cargar colaboradores.");
        return r.json();
      })
      .then((data: OrgEmployee[]) => { setEmployees(data); setIsLoaded(true); })
      .catch((e: Error) => { setError(e.message); setIsLoaded(true); });
  }, [apiEndpoint]);

  const departments = useMemo(() => {
    const map = new Map<string, OrgEmployee[]>();
    for (const emp of employees) {
      const dept = emp.department?.trim() || "Sin departamento";
      const list = map.get(dept) ?? [];
      list.push(emp);
      map.set(dept, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "Sin departamento") return 1;
        if (b === "Sin departamento") return -1;
        return a.localeCompare(b, "es");
      })
      .map(([name, emps]) => ({ name, employees: emps }));
  }, [employees]);

  if (!isLoaded) return <p className="text-sm text-muted-foreground py-6">Cargando…</p>;
  if (error) return <p className="text-sm text-destructive py-6">{error}</p>;
  if (employees.length === 0) return (
    <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-8 text-center">
      No hay colaboradores registrados.
    </p>
  );

  const COLUMN_W = 168; // px — width per department column
  const deptCount = departments.length;

  return (
    <div className="overflow-x-auto pb-6 pt-2">
      <div className="min-w-max flex flex-col items-center">

        {/* ── Root node ── */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 px-8 py-3 text-center shadow-sm">
          <p className="text-sm font-bold">{companyName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{employees.length} colaborador{employees.length !== 1 ? "es" : ""}</p>
        </div>

        {/* ── Vertical connector root → horizontal bar ── */}
        <div className="w-px h-8 bg-border" />

        {/* ── Departments ── */}
        <div className="flex" style={{ width: deptCount * COLUMN_W }}>
          {departments.map((dept, i) => (
            <div
              key={dept.name}
              className="flex flex-col items-center"
              style={{ width: COLUMN_W }}
            >
              {/* Horizontal bar half + vertical connector to dept */}
              <div className="flex w-full h-8">
                {/* Left half (transparent for first dept) */}
                <div
                  className="flex-1 self-end h-px"
                  style={{ background: i === 0 ? "transparent" : "hsl(var(--border))" }}
                />
                {/* Vertical center line */}
                <div className="w-px bg-border" />
                {/* Right half (transparent for last dept) */}
                <div
                  className="flex-1 self-end h-px"
                  style={{ background: i === deptCount - 1 ? "transparent" : "hsl(var(--border))" }}
                />
              </div>

              {/* Department badge */}
              <div className="rounded-full border bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-wider max-w-[148px] truncate">
                {dept.name}
              </div>

              {/* Vertical connector dept → employees */}
              <div className="w-px h-6 bg-border" />

              {/* Employee cards */}
              <div className="flex flex-col items-center gap-0">
                {dept.employees.map((emp, j) => (
                  <div key={emp.id} className="flex flex-col items-center">
                    {j > 0 && <div className="w-px h-3 bg-border" />}
                    <EmployeeCard emp={emp} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
