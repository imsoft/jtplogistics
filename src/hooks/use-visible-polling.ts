"use client";

import { useEffect } from "react";

/**
 * Llama a `callback` al montar y luego cada `ms`, pero solo mientras la
 * pestaña está a la vista. Una pestaña olvidada en segundo plano no consulta
 * nada: así la base de datos (Neon) puede apagarse sola y no se gastan horas
 * de cómputo de noche o cuando nadie está viendo la pantalla. Al volver a la
 * pestaña se consulta de inmediato.
 */
export function useVisiblePolling(callback: () => unknown, ms: number) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void callback();
      timer = setInterval(() => void callback(), ms);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, ms]);
}
