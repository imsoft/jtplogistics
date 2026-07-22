"use client";

import { ResourceSelect } from "./resource-select";

interface EmailAccountSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  endpoint?: string;
}

export function EmailAccountSelect({
  label = "Correo vinculado",
  value,
  onValueChange,
  placeholder = "",
  endpoint = "/api/admin/emails",
}: EmailAccountSelectProps) {
  return (
    <ResourceSelect
      endpoint={endpoint}
      toOption={(e) => ({ id: e.id, label: e.email })}
      label={label}
      value={value}
      onValueChange={onValueChange}
      noneLabel={placeholder}
      optionsNormalCase
    />
  );
}
