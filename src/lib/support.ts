/**
 * Datos del soporte de TI de JTP. Se muestran a los colaboradores cuando
 * tienen un problema con su equipo, así que viven en un solo sitio.
 */
export const IT_SUPPORT = {
  name: "Brandon García",
  email: "software@jtp.com.mx",
  /** Como se marca. */
  phone: "3325365558",
  /** Como se lee. */
  phoneLabel: "33 2536 5558",
} as const;

/** Enlace de WhatsApp con el saludo ya escrito. */
export function whatsappLink(message: string): string {
  return `https://wa.me/52${IT_SUPPORT.phone}?text=${encodeURIComponent(message)}`;
}

export const MAINTENANCE_KIND_LABELS = {
  preventive: "Preventivo",
  corrective: "Correctivo",
} as const;

export const MAINTENANCE_STATUS_LABELS = {
  scheduled: "Programado",
  done: "Realizado",
  cancelled: "Cancelado",
} as const;

export const TICKET_STATUS_LABELS = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
} as const;

export const EQUIPMENT_KIND_LABELS = {
  laptop: "Laptop",
  phone: "Celular",
} as const;
