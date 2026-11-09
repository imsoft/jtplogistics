"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const steps = [
  {
    popover: {
      title: "¡Bienvenido a JTP Logistics! 🚛",
      description:
        "Te mostraremos las principales funciones de tu panel en unos pasos rápidos. Puedes saltar el tour en cualquier momento.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar']",
    popover: {
      title: "Menú de navegación",
      description:
        "Desde aquí accedes a todas las secciones de tu panel: inicio, tipos de unidad, mensajes, sugerencias y tu perfil.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard']",
    popover: {
      title: "Inicio",
      description:
        "Aquí verás el resumen de todas las rutas que tienes registradas y los targets que guardaste.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard/unit-types']",
    popover: {
      title: "Tipos de unidad",
      description:
        "Selecciona las rutas que ofreces para cada tipo de unidad (caja seca, refrigerada, etc.) y establece tu target de precio.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard/suggestions']",
    popover: {
      title: "Sugerencias",
      description:
        "Envía sugerencias o comentarios al equipo de JTP Logistics para mejorar la plataforma.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard/profile']",
    popover: {
      title: "Mi perfil",
      description:
        "Actualiza los datos de tu empresa, tus contactos y tu foto.",
      side: "right" as const,
      align: "center" as const,
    },
  },
];

export function CarrierOnboardingTour({ completed }: { completed: boolean }) {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "¡Listo!",
      // Un clic accidental sobre el fondo avanza en vez de cerrar el tour;
      // cerrarlo requiere la X o ESC, que sí son intencionales.
      overlayClickBehavior: "nextStep",
      steps: steps.filter((s) => {
        if (!s.element) return true;
        return document.querySelector(s.element) !== null;
      }),
      onDestroyStarted: () => {
        driverObj.destroy();
        void fetch("/api/tour", { method: "POST" });
      },
    });
    driverObj.drive();
  }, []);

  useEffect(() => {
    if (completed) return;
    const t = setTimeout(() => startTour(), 900);
    return () => clearTimeout(t);
  }, [completed, startTour]);

  // Va en el encabezado, junto a la campana: abajo a la derecha tapaba botones e información.
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => startTour()}
      aria-label="Iniciar tour de la plataforma"
      title="Tour guiado"
      className="shrink-0"
    >
      <CircleHelp className="size-4" />
    </Button>
  );
}
