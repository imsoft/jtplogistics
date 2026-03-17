"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Detect when a new service worker takes over (app updated)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast("Nueva versión disponible", {
                description: "Recarga la página para aplicar la actualización.",
                duration: Infinity,
                action: {
                  label: "Recargar",
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        });
      })
      .catch((err) => console.error("SW registration failed:", err));

    // Capture install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;

      toast("Instalar JTP Logistics", {
        description: "Agrega la app a tu pantalla de inicio para acceso rápido.",
        duration: 12000,
        action: {
          label: "Instalar",
          onClick: async () => {
            if (!deferredPrompt.current) return;
            await deferredPrompt.current.prompt();
            deferredPrompt.current = null;
          },
        },
      });
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  return null;
}
