"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type"
> & {
  className?: string;
};

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupInput
        type={showPassword ? "text" : "password"}
        // Al pulsar el ojo el type pasa a "text", así que el input dejaría de
        // ser reconocido como contraseña y se mostraría en mayúsculas. Esta
        // clase viaja después de la del primitivo, así que twMerge la conserva.
        className="normal-case tracking-normal"
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
