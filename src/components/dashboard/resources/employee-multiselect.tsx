"use client";

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface EmployeeOption {
  id: string;
  name: string;
}

interface EmployeeMultiSelectProps {
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
}

export function EmployeeMultiSelect({
  label,
  value,
  onChange,
}: EmployeeMultiSelectProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((data: EmployeeOption[]) => setEmployees(data))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, search]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  if (employees.length === 0) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <p className="text-muted-foreground text-sm">No hay colaboradores registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="rounded-md border">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar colaborador…"
            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-1">Sin resultados.</p>
          ) : (
            filtered.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`emp-${e.id}`}
                  checked={value.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="size-4 accent-primary cursor-pointer"
                />
                <label
                  htmlFor={`emp-${e.id}`}
                  className="text-sm cursor-pointer select-none"
                >
                  {e.name}
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
