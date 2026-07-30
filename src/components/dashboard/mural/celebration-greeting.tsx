"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Cake, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfettiBurst } from "@/components/dashboard/mural/confetti-burst";
import type { MuralCelebration } from "@/types/mural.types";

/** Marca en localStorage el día que ya se felicitó, para no abrirlo en cada navegación. */
const SEEN_KEY = "jtp-celebration-seen";

function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? fullName;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Felicitación de cumpleaños o aniversario. Solo se monta el día de la persona:
 * si hoy no es su día, el endpoint devuelve null y no se dibuja ni el botón.
 */
export function CelebrationGreeting() {
  const [celebration, setCelebration] = useState<MuralCelebration | null>(null);
  const [open, setOpen] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/mural/my-celebration")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MuralCelebration | null) => {
        if (cancelled || !data) return;
        setCelebration(data);

        // Se abre solo la primera vez del día; después queda el botón.
        const today = data.date.slice(0, 10);
        if (window.localStorage.getItem(SEEN_KEY) !== today) {
          window.localStorage.setItem(SEEN_KEY, today);
          setOpen(true);
          setConfettiKey((k) => k + 1);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const celebrate = useCallback(() => {
    setOpen(true);
    setConfettiKey((k) => k + 1);
  }, []);

  if (!celebration) return null;

  const isBirthday = celebration.kind === "birthday";
  const Icon = isBirthday ? Cake : PartyPopper;
  const name = firstName(celebration.name);
  const years = celebration.years;

  const heading = isBirthday ? `¡Feliz cumpleaños, ${name}!` : `¡Felicidades, ${name}!`;
  const message = isBirthday
    ? years
      ? `Hoy cumples ${years} años y todo el equipo de JTP Logistics te desea un día increíble.`
      : "Todo el equipo de JTP Logistics te desea un día increíble."
    : years
      ? `Hoy cumples ${years} ${years === 1 ? "año" : "años"} en JTP Logistics. Gracias por todo lo que aportas al equipo.`
      : "Hoy celebramos tu aniversario en JTP Logistics. Gracias por todo lo que aportas al equipo.";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={celebrate}
        title={isBirthday ? "¡Es tu cumpleaños!" : "¡Es tu aniversario!"}
        aria-label={isBirthday ? "Ver felicitación de cumpleaños" : "Ver felicitación de aniversario"}
        className="relative"
      >
        <Icon className="size-5 text-pink-500" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-pink-500" />
      </Button>

      {open && <ConfettiBurst runKey={confettiKey} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <Image
              src="/images/logo/jtp-logistics.png"
              alt="JTP Logistics"
              width={160}
              height={64}
              className="h-14 w-auto object-contain"
              priority
            />

            <div className="flex size-16 items-center justify-center rounded-full bg-pink-100">
              <Icon className="size-8 text-pink-500" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">{heading}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {message}
              </DialogDescription>
            </div>

            <Button onClick={celebrate} className="w-full sm:w-auto">
              <PartyPopper className="size-4" />
              ¡Otra vez!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
