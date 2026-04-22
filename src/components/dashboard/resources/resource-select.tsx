"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  noneLabel = "Sin asignar",
}: ResourceSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Record<string, string>[]) => setOptions(data.map(toOption)))
      .catch(() => setFetchError(true));
  }, [endpoint, toOption]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = value === "" || value === NONE
    ? noneLabel
    : (options.find((o) => o.id === value)?.label ?? noneLabel);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {fetchError && (
        <p className="text-destructive text-xs">Error al cargar opciones</p>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={NONE}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("size-4", value === "" || value === NONE ? "opacity-100" : "opacity-0")} />
                  {noneLabel}
                </CommandItem>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    onSelect={() => {
                      onValueChange(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={cn("size-4", value === opt.id ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
