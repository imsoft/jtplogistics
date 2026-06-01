"use client";

import { useEffect } from "react";

// global-error reemplaza el layout raíz, por lo que usa estilos en línea
// para no depender de hojas de estilo que podrían no haber cargado.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#ffffff",
          color: "#18181b",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#dc2626",
              margin: "0 0 0.5rem",
            }}
          >
            Error
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#52525b", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Vuelve a intentarlo; si el problema
            persiste, recarga la página.
          </p>
          {error.digest ? (
            <p
              style={{
                color: "#a1a1aa",
                fontSize: "0.75rem",
                margin: "0 0 1.5rem",
              }}
            >
              Código: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "#3b46e0",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
