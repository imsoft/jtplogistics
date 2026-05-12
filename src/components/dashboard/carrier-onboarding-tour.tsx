"use client";

import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "jtp_carrier_tour_v1";

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
        "Desde aquí accedes a todas las secciones de tu panel: inicio, tipos de unidad, mensajes, sugerencias, colaboradores y tu perfil.",
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
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard/collaborators']",
    popover: {
      title: "Colaboradores",
      description:
        "Administra a las personas de tu equipo que también tendrán acceso al panel.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/carrier/dashboard/profile']",
    popover: {
      title: "Mi perfil",
      description:
        "Actualiza tus datos de contacto, cambia tu contraseña y personaliza tu cuenta.",
      side: "right" as const,
      align: "center" as const,
    },
  },
];

export function CarrierOnboardingTour() {
  const startTour = useCallback((onFinish?: () => void) => {
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "¡Listo!",
      steps: steps.filter((s) => {
        if (!s.element) return true;
        return document.querySelector(s.element) !== null;
      }),
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem(TOUR_KEY, "done");
        onFinish?.();
      },
    });
    driverObj.drive();
  }, []);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (done) return;
    const t = setTimeout(() => startTour(), 900);
    return () => clearTimeout(t);
  }, [startTour]);

  return (
    <button
      onClick={() => startTour()}
      aria-label="Iniciar tour de la plataforma"
      title="Tour guiado"
      className="fixed bottom-20 right-6 z-40 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm font-bold leading-none">?</span>
    </button>
  );
}
