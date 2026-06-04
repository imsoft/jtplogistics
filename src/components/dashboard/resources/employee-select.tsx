"use client";

import { ResourceSelect } from "./resource-select";

interface EmployeeSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  endpoint?: string;
}

export function EmployeeSelect({
  label = "Asignado a",
  value,
  onValueChange,
  placeholder = "",
  endpoint = "/api/admin/employees",
}: EmployeeSelectProps) {
  return (
    <ResourceSelect
      endpoint={endpoint}
      toOption={(e) => ({ id: e.id, label: e.name })}
      label={label}
      value={value}
      onValueChange={onValueChange}
      noneLabel={placeholder}
    />
  );
}
