"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export interface AppSelectOption {
  value: string
  label: string
}

interface AppSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  disabled?: boolean
  className?: string
  /**
   * Dónde montar la lista desplegable. Solo hace falta dentro de un diálogo:
   * ahí hay que apuntar a un nodo del propio diálogo para que se pueda clicar.
   */
  container?: React.RefObject<HTMLElement | null>
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function accentFilter(item: AppSelectOption, query: string) {
  return normalize(item.label).includes(normalize(query))
}

export function AppSelect({ value, onValueChange, options, disabled, className, container }: AppSelectProps) {
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  return (
    <Combobox
      items={options}
      itemToStringValue={(o) => o.label}
      filter={accentFilter}
      value={selected}
      onValueChange={(o) => onValueChange(o?.value ?? "")}
      disabled={disabled}
      autoHighlight
    >
      <ComboboxInput showClear={!!selected} className={cn("w-full", className)} />
      <ComboboxContent container={container}>
        <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
