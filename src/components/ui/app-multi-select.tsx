"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"

interface AppMultiSelectProps {
  /** Valores marcados. */
  value: string[]
  onValueChange: (value: string[]) => void
  options: string[]
  /** Con Enter se agrega lo tecleado aunque no esté en las opciones. */
  allowCustom?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/**
 * Desplegable para elegir varios: igual al de un solo valor, pero lo marcado
 * se queda como etiquetas dentro del campo y la lista muestra una palomita.
 * Lo marcado que no está en las opciones (por ejemplo, lo guardado en un
 * registro viejo) también se ofrece para que no se pierda.
 */
export function AppMultiSelect({ value, onValueChange, options, allowCustom, disabled, className, id }: AppMultiSelectProps) {
  const anchor = useComboboxAnchor()
  const [query, setQuery] = React.useState("")
  const items = React.useMemo(
    () => [...options, ...value.filter((v) => !options.some((o) => normalize(o) === normalize(v)))],
    [options, value]
  )

  const addCustom = () => {
    const text = query.trim()
    if (!text) return
    if (!value.some((v) => normalize(v) === normalize(text))) onValueChange([...value, text])
    setQuery("")
  }

  return (
    <Combobox
      multiple
      items={items}
      value={value}
      // Escape con la lista cerrada borraría todo lo marcado: aquí no.
      onValueChange={(next, details) => {
        if (details.reason === "escape-key") return
        onValueChange(next as string[])
      }}
      filter={(item: string, q: string) => normalize(item).includes(normalize(q))}
      inputValue={query}
      onInputValueChange={setQuery}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className={cn(disabled && "pointer-events-none bg-muted/40 opacity-50", className)}>
        <ComboboxValue>
          {(selected: string[]) => (
            <>
              {selected.map((v) => (
                <ComboboxChip key={v} className="bg-primary/10 text-primary uppercase tracking-wide" showRemove={!disabled}>
                  {v}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                className="text-sm font-medium uppercase tracking-wide"
                onKeyDown={(e) => {
                  if (allowCustom && e.key === "Enter" && query.trim() && !items.some((i) => normalize(i) === normalize(query))) {
                    e.preventDefault()
                    addCustom()
                  }
                }}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{allowCustom && query.trim() ? "Sin resultados. Enter agrega lo escrito." : "Sin resultados."}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
