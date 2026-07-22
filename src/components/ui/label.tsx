"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  // Las etiquetas son texto de interfaz ("Correo electrónico", "Contraseña"),
  // no el valor del campo, así que siempre van en mayúsculas. La excepción de
  // minúsculas/sin transformar aplica solo al contenido: correos y contraseñas.
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "uppercase tracking-wide",
        className
      )}
      {...props}
    />
  )
}

export { Label }
