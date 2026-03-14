"use client";

import { ResourceSelect } from "./resource-select";

interface EmployeeSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function EmployeeSelect({
  label = "Asignado a",
  value,
  onValueChange,
  placeholder = "",
}: EmployeeSelectProps) {
  return (
    <ResourceSelect
      endpoint="/api/admin/employees"
      toOption={(e) => ({ id: e.id, label: e.name })}
      label={label}
      value={value}
      onValueChange={onValueChange}
      noneLabel={placeholder}
    />
  );
}
