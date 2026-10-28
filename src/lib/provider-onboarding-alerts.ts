/**
 * Avisos de Alta de proveedores para quien da seguimiento a las altas (Liz):
 * prospecto listo para abrir su alta, alta nueva, alta completa y cambio de
 * contrato. Llegan a la campana y por correo a quien tenga el permiso
 * "Alta de proveedores: recibir avisos".
 *
 * Los textos son puros, para poder probarlos.
 */

export type OnboardingAlert =
  | { kind: "prospect_ready"; prospectId: string; name: string; status: "en_alta" | "listo" }
  | { kind: "created"; onboardingId: string; name: string }
  | { kind: "completed"; onboardingId: string; name: string }
  | { kind: "contract"; onboardingId: string; name: string; contractLabel: string };

export function onboardingAlertText(a: OnboardingAlert, actorName: string): { subject: string; title: string; body: string } {
  const who = actorName.trim() || "Alguien";
  switch (a.kind) {
    case "prospect_ready":
      return {
        subject: `Prospecto listo para alta: ${a.name}`,
        title: `${a.name}: listo para abrir su alta`,
        body: `${who} lo pasó a "${a.status === "listo" ? "Listo para operar" : "En proceso de alta"}" en Prospección. Falta abrir su expediente en Alta de proveedores.`,
      };
    case "created":
      return { subject: `Alta nueva: ${a.name}`, title: `Alta nueva: ${a.name}`, body: `${who} abrió el expediente de alta.` };
    case "completed":
      return { subject: `Alta completa: ${a.name}`, title: `Alta completa: ${a.name}`, body: "Ya no tiene documentos pendientes en el expediente." };
    case "contract":
      return { subject: `Contrato de ${a.name}: ${a.contractLabel}`, title: `Contrato de ${a.name}`, body: `${who} lo cambió a "${a.contractLabel}".` };
  }
}

/** A dónde lleva el aviso, en el panel de cada quien. */
export function onboardingAlertHref(role: string, a: OnboardingAlert): string {
  const base = role === "admin" ? "/admin/dashboard/provider-onboardings" : "/collaborator/dashboard/provider-onboardings";
  return a.kind === "prospect_ready" ? base : `${base}/${a.onboardingId}/edit`;
}
