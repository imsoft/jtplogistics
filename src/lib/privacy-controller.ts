/**
 * Datos del responsable que salen en el aviso de privacidad
 * (/aviso-de-privacidad). Razón social y domicilio son los mismos del acta
 * administrativa (lib/acta-administrativa.ts); el correo lo eligió JTP.
 */
import { COMPANY_ADDRESS, COMPANY_LEGAL_NAME } from "@/lib/acta-administrativa";

export const PRIVACY_CONTROLLER = {
  legalName: COMPANY_LEGAL_NAME,
  address: COMPANY_ADDRESS,
  email: "pricing@jtp.com.mx",
  website: "https://www.jtplogistics.com",
};
