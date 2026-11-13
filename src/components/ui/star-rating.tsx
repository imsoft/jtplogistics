"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-3.5", md: "size-5", lg: "size-7" } as const;

/** Estrella llena, media o vacía según cuánto le toca (0, 0.5 o 1). */
function StarFill({ fill, className }: { fill: number; className: string }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <Star className={cn("absolute inset-0 text-muted-foreground/30", className)} />
      {fill > 0 && (
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Star className={cn("fill-amber-400 text-amber-400", className)} />
        </span>
      )}
    </span>
  );
}

/** Estrellas de 1 a 5 con medias (4.5 = cuatro y media), como en Uber. */
export function StarRating({ stars, size = "sm", showNumber = false }: { stars: number | null; size?: keyof typeof SIZES; showNumber?: boolean }) {
  const value = stars ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={stars !== null ? `${stars} de 5 estrellas` : "Sin calificación"}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarFill key={n} fill={Math.max(0, Math.min(1, value - (n - 1)))} className={SIZES[size]} />
        ))}
      </span>
      {showNumber && <span className="font-bold tabular-nums">{stars !== null ? stars.toFixed(1) : "—"}</span>}
    </span>
  );
}

/**
 * Para calificar: cada estrella tiene dos mitades, la izquierda pone la media
 * (4.5) y la derecha la entera (5).
 */
export function StarInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="relative">
            <StarFill fill={Math.max(0, Math.min(1, shown - (n - 1)))} className="size-7" />
            {[n - 0.5, n].map((v, i) => (
              <button
                key={v}
                type="button"
                disabled={disabled || v < 1}
                onClick={() => onChange(v)}
                onMouseEnter={() => v >= 1 && setHover(v)}
                className={cn("absolute inset-y-0 w-1/2 disabled:cursor-not-allowed", i === 0 ? "left-0" : "right-0")}
                aria-label={`${v} estrella${v !== 1 ? "s" : ""}`}
              />
            ))}
          </span>
        ))}
      </span>
      <span className="w-8 text-sm font-bold tabular-nums">{shown ? shown.toFixed(1) : "—"}</span>
    </span>
  );
}
