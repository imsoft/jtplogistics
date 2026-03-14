"use client";

import { ResourceSelect } from "./resource-select";

interface EmailAccountSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function EmailAccountSelect({
  label = "Correo vinculado",
  value,
  onValueChange,
  placeholder = "",
}: EmailAccountSelectProps) {
  return (
    <ResourceSelect
      endpoint="/api/admin/emails"
      toOption={(e) => ({ id: e.id, label: e.email })}
      label={label}
      value={value}
      onValueChange={onValueChange}
      noneLabel={placeholder}
    />
  );
}
