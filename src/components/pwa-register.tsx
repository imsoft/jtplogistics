"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const { data: session } = useSession();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const userId = session?.user?.id;

  const getShownKey = useCallback((uid: string) => `pwa_install_prompt_shown_${uid}`, []);
  const getDismissedKey = useCallback((uid: string) => `pwa_install_prompt_dismissed_${uid}`, []);

  const showInstallToast = useCallback(() => {
    if (!userId || !deferredPrompt.current) return;

    const shownKey = getShownKey(userId);
    const dismissedKey = getDismissedKey(userId);
    if (sessionStorage.getItem(shownKey) === "1" || sessionStorage.getItem(dismissedKey) === "1") return;

    sessionStorage.setItem(shownKey, "1");
    toast("Instalar JTP Logistics", {
      id: "pwa-install-toast",
      description: "Agrega la app a tu pantalla de inicio para acceso rápido.",
      duration: Infinity,
      onDismiss: () => sessionStorage.setItem(dismissedKey, "1"),
      action: {
        label: "Instalar",
        onClick: async () => {
          if (!deferredPrompt.current) return;
          await deferredPrompt.current.prompt();
          deferredPrompt.current = null;
        },
      },
    });
  }, [getDismissedKey, getShownKey, userId]);

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
      showInstallToast();
    };

    const handleInstalled = () => {
      deferredPrompt.current = null;
      toast.dismiss("pwa-install-toast");
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [showInstallToast]);

  useEffect(() => {
    // Nueva sesión de login: limpiar estado anterior para volver a mostrar el prompt.
    if (!userId) {
      const lastUserId = sessionStorage.getItem("pwa_install_last_user");
      if (lastUserId) {
        sessionStorage.removeItem(getShownKey(lastUserId));
        sessionStorage.removeItem(getDismissedKey(lastUserId));
      }
      sessionStorage.removeItem("pwa_install_last_user");
      return;
    }

    sessionStorage.setItem("pwa_install_last_user", userId);
    showInstallToast();
  }, [getDismissedKey, getShownKey, showInstallToast, userId]);

  return null;
}
