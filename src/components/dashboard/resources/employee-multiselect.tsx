"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((data: EmployeeOption[]) => setEmployees(data))
      .catch(() => {});
  }, []);

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
      <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
        {employees.map((e) => (
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
        ))}
      </div>
    </div>
  );
}
