"use client";

import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "jtp_tour_v1";

const steps = [
  {
    popover: {
      title: "¡Bienvenido a JTP Logistics! 🚛",
      description:
        "Te mostraremos las principales funciones de la plataforma en unos pasos rápidos. Puedes saltar el tour en cualquier momento.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar']",
    popover: {
      title: "Menú de navegación",
      description:
        "Desde aquí accedes a todas las secciones: rutas, embarques, clientes, transportistas, colaboradores y más.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/routes']",
    popover: {
      title: "Rutas",
      description:
        "Gestiona las rutas de transporte: origen, destino, tipo de unidad y tarifas. Asigna transportistas y clientes a cada ruta.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/shipments']",
    popover: {
      title: "Embarques",
      description:
        "Registra y da seguimiento a cada embarque: estado, operador, fechas y documentación. Consulta la línea de tiempo de cada envío.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/finances']",
    popover: {
      title: "Finanzas",
      description:
        "Consulta el desempeño financiero por ruta y cliente: márgenes, ventas, costos y rutas más rentables.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/providers']",
    popover: {
      title: "Transportistas",
      description:
        "Administra tus proveedores de transporte y consulta su rating basado en cumplimiento de targets, puntualidad e incidencias.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/clients']",
    popover: {
      title: "Clientes",
      description:
        "Gestiona la información de tus clientes: razón social, RFC, contactos y las rutas que tienen asignadas.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-sidebar='sidebar'] a[href='/admin/dashboard/employees']",
    popover: {
      title: "Colaboradores",
      description:
        "Visualiza el organigrama por departamento y administra a los integrantes de tu equipo.",
      side: "right" as const,
      align: "center" as const,
    },
  },
  {
    element: "#tour-header-search",
    popover: {
      title: "Búsqueda global",
      description:
        "Busca cualquier ruta, embarque, cliente o transportista desde aquí sin importar en qué sección estés.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    element: "#tour-header-notifications",
    popover: {
      title: "Notificaciones",
      description:
        "Recibe alertas sobre embarques, cambios de estado y actividad importante de tu equipo en tiempo real.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
];

export function OnboardingTour() {
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
