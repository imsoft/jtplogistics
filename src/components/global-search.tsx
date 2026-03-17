"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Route, Truck, UserRound, Users, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";

type ResultType = "route" | "carrier" | "employee" | "client" | "vendor";

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

const TYPE_CONFIG: Record<ResultType, { label: string; icon: React.ElementType }> = {
  route:    { label: "Rutas",         icon: Route },
  carrier:  { label: "Transportistas", icon: Truck },
  employee: { label: "Colaboradores", icon: UserRound },
  client:   { label: "Clientes",      icon: Users },
  vendor:   { label: "Vendedores",    icon: ShoppingBag },
};

const GROUP_ORDER: ResultType[] = ["route", "carrier", "employee", "client", "vendor"];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, 250);

  // Atajo de teclado Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Limpiar al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      });
      if (res.ok) setResults(await res.json());
    } catch (e) {
      if ((e as Error).name !== "AbortError") setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  // Agrupa resultados por tipo manteniendo el orden definido
  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  function sublabelForRoute(result: SearchResult) {
    const status = result.sublabel as keyof typeof ROUTE_STATUS_LABELS;
    return ROUTE_STATUS_LABELS[status] ?? result.sublabel;
  }

  return (
    <>
      {/* Botón trigger en el header */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-muted-foreground w-48 justify-between font-normal"
        onClick={() => setOpen(true)}
        aria-label="Búsqueda global"
      >
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" />
          <span className="text-xs">Buscar…</span>
        </span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] opacity-70 sm:flex">
          <span>⌘</span>K
        </kbd>
      </Button>

      {/* Botón icono en móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Búsqueda global"
      >
        <Search className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Búsqueda global"
        description="Busca rutas, transportistas, empleados, clientes y vendedores"
        showCloseButton={false}
      >
        <CommandInput
          placeholder="Buscar rutas, transportistas, empleados…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {debouncedQuery.length >= 2 && !isLoading && results.length === 0 && (
            <CommandEmpty>Sin resultados para &ldquo;{debouncedQuery}&rdquo;.</CommandEmpty>
          )}
          {debouncedQuery.length < 2 && (
            <CommandEmpty className="p-4 text-muted-foreground">
              Escribe al menos 2 caracteres para buscar.
            </CommandEmpty>
          )}

          {grouped.map((group, i) => {
            const { label, icon: Icon } = TYPE_CONFIG[group.type];
            return (
              <span key={group.type}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={label}>
                  {group.items.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={`${result.type}-${result.id}-${result.label}`}
                      onSelect={() => handleSelect(result.href)}
                      className="gap-3"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{result.label}</span>
                        {result.sublabel && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.type === "route"
                              ? sublabelForRoute(result)
                              : result.sublabel}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </span>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
