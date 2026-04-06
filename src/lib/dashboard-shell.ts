/**
 * Clases del contenedor principal del dashboard cuando hay FloatingChat.
 * El FAB es fixed bottom-6 right-6, size-14 (3.5rem). Sin este padding, la
 * paginación y acciones inferiores quedan debajo del botón.
 *
 * No sustituye un “ancho máximo” de página: el solapamiento es por posición
 * fija en la esquina del viewport, no por falta de max-width.
 */
export const dashboardMainWithFloatingChatClassName =
  "flex min-w-0 flex-1 flex-col min-h-0 px-4 pt-4 pb-28 pe-24 sm:px-6 sm:pt-6 sm:pb-32 sm:pe-28";
