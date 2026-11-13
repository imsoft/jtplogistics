"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, formatPhoneLive, formatPlates, formatPlatesLive } from "@/lib/phone-plates";

type InputProps = React.ComponentProps<typeof Input>;

/**
 * Un Input que pone los guiones solo: mientras se escribe (`live`) y al salir
 * del campo (`final`). Funciona igual con valor controlado o con `name` en un
 * formulario: cambia el valor del input antes de avisar al `onChange`.
 */
function FormattedInput({
  live,
  final,
  onChange,
  onBlur,
  ...props
}: InputProps & { live: (v: string) => string; final: (v: string) => string }) {
  return (
    <Input
      {...props}
      onChange={(e) => {
        const next = live(e.target.value);
        if (next !== e.target.value) e.target.value = next;
        onChange?.(e);
      }}
      onBlur={(e) => {
        const next = final(e.target.value);
        if (next !== e.target.value) {
          e.target.value = next;
          onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onBlur?.(e);
      }}
    />
  );
}

/** Teléfono: "33-3410-9866". */
export function PhoneInput(props: InputProps) {
  return <FormattedInput type="tel" inputMode="tel" autoComplete="tel" {...props} live={formatPhoneLive} final={formatPhone} />;
}

/** Placas: "02-AZ-1A". */
export function PlatesInput(props: InputProps) {
  return <FormattedInput autoCapitalize="characters" {...props} live={formatPlatesLive} final={formatPlates} />;
}
