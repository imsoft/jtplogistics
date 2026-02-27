"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Option {
  id: string;
  label: string;
}

interface ResourceSelectProps {
  endpoint: string;
  toOption: (item: Record<string, string>) => Option;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  noneLabel?: string;
}

const NONE = "__none__";

export function ResourceSelect({
  endpoint,
  toOption,
  label,
  value,
  onValueChange,
  placeholder = "Sin asignar",
  noneLabel = "Sin asignar",
}: ResourceSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Record<string, string>[]) => setOptions(data.map(toOption)))
      .catch(() => setFetchError(true));
  }, [endpoint, toOption]);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {fetchError && (
        <p className="text-destructive text-xs">Error al cargar opciones</p>
      )}
      <Select
        value={value === "" ? NONE : value}
        onValueChange={(v) => onValueChange(v === NONE ? "" : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
