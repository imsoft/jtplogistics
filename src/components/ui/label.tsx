"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  // Los campos de correo y contraseña se muestran tal cual se escriben,
  // sin forzar mayúsculas (igual que sus inputs).
  const htmlFor = typeof props.htmlFor === "string" ? props.htmlFor : ""
  const isCredential = /email|password/i.test(htmlFor)
  const casingClass = isCredential
    ? "normal-case tracking-normal"
    : "uppercase tracking-wide"

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        casingClass,
        className
      )}
      {...props}
    />
  )
}

export { Label }
