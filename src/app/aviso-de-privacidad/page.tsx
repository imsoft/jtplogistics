import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PRIVACY_CONTROLLER } from "@/lib/privacy-controller";

/**
 * Aviso de privacidad (LFPDPPP). Público: Meta lo pide para publicar la app de
 * WhatsApp y cualquier cliente o transportista debe poder leerlo sin cuenta.
 * Los datos del responsable están en lib/privacy-controller.ts.
 */

// Se renderiza por petición: una página prerenderizada sale sin el nonce de la
// CSP y el navegador le bloquea el JavaScript (ver proxy.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aviso de privacidad | JTP Logistics",
  description: "Cómo JTP Logistics trata los datos personales de sus clientes, transportistas y usuarios.",
};

const UPDATED_AT = "24 de noviembre de 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyNoticePage() {
  const c = PRIVACY_CONTROLLER;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="JTP Logistics">
            <Image src="/images/logo/jtp-logistics.png" alt="JTP Logistics" width={160} height={160} className="h-14 w-auto" priority />
          </Link>
        </div>
      </header>

      <div
        className="border-b"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% -20%, oklch(0.92 0.04 264.376 / 0.45) 0%, transparent 70%)" }}
      >
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-widest text-primary">JTP Logistics</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Aviso de privacidad</h1>
          <p className="mt-4 text-xs text-muted-foreground">Última actualización: {UPDATED_AT}</p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
        <Section id="responsable" title="1. Responsable de tus datos">
          <p>
            {c.legalName} (en adelante, &quot;JTP Logistics&quot;), con domicilio en {c.address}, es responsable del
            tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de
            los Particulares y su Reglamento.
          </p>
          <p>
            Para cualquier tema de privacidad escríbenos a{" "}
            <a className="font-medium text-primary hover:underline" href={`mailto:${c.email}`}>
              {c.email}
            </a>
            .
          </p>
        </Section>

        <Section id="datos" title="2. Datos que recabamos">
          <p>Según la relación que tengas con nosotros, podemos tratar:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Datos de identificación y contacto: nombre, puesto, empresa, teléfono, celular (incluido WhatsApp) y correo.</li>
            <li>Datos fiscales: razón social, RFC, régimen fiscal, código postal y domicilio fiscal.</li>
            <li>Datos de operación: direcciones de carga y entrega, mercancías, referencias, fechas y estado de los embarques.</li>
            <li>
              De transportistas: datos de la empresa, unidades, placas, operadores y licencias necesarios para la Carta
              Porte, y las tarifas que registran.
            </li>
            <li>De usuarios de la plataforma: correo, contraseña cifrada y registros de acceso.</li>
          </ul>
          <p>No recabamos datos personales sensibles.</p>
        </Section>

        <Section id="finalidades" title="3. Para qué los usamos">
          <p>Finalidades necesarias para el servicio:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Cotizar, contratar, programar y dar seguimiento a tus embarques.</li>
            <li>
              Avisarte por WhatsApp, correo o teléfono del estado de tus embarques (cambios de estado, retrasos y entregas).
            </li>
            <li>Emitir Carta Porte, facturas y demás documentos que exige la ley.</li>
            <li>Dar de alta y evaluar a transportistas, y pagarles sus servicios.</li>
            <li>Dar acceso y soporte en la plataforma, y mantenerla segura.</li>
          </ul>
          <p>Finalidad adicional, que puedes rechazar sin afectar el servicio: enviarte información comercial de JTP Logistics.</p>
          <p>
            Si no quieres que usemos tus datos para la finalidad adicional, o ya no quieres recibir avisos por WhatsApp,
            escríbenos a {c.email}.
          </p>
        </Section>

        <Section id="transferencias" title="4. Con quién los compartimos">
          <p>Solo compartimos tus datos cuando es necesario para darte el servicio o lo exige la ley:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Transportistas y operadores que realizan tu embarque (los datos de carga y entrega).</li>
            <li>Autoridades fiscales y de transporte, cuando la ley lo requiere (por ejemplo, el SAT con la Carta Porte).</li>
            <li>
              Proveedores que nos dan servicios tecnológicos, como el alojamiento de la plataforma, el envío de correos y
              WhatsApp Business de Meta, que tratan los datos por nuestra cuenta.
            </li>
          </ul>
          <p>Estas transferencias no requieren tu consentimiento según el artículo 37 de la Ley.</p>
        </Section>

        <Section id="arco" title="5. Tus derechos (ARCO) y cómo revocar tu consentimiento">
          <p>
            Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso, así como revocar tu consentimiento,
            enviando una solicitud a {c.email} con tu nombre, un medio para responderte, una identificación y la
            descripción clara de lo que pides. Te responderemos en un máximo de 20 días hábiles y, si procede, lo haremos
            efectivo dentro de los 15 días hábiles siguientes.
          </p>
        </Section>

        <Section id="tecnologias" title="6. Cookies">
          <p>
            La plataforma usa solo las cookies necesarias para mantener tu sesión iniciada y protegerla. No usamos cookies
            de publicidad.
          </p>
        </Section>

        <Section id="cambios" title="7. Cambios a este aviso">
          <p>
            Cualquier cambio a este aviso se publicará en esta misma página ({c.website}/aviso-de-privacidad), con su fecha
            de actualización.
          </p>
        </Section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-muted-foreground sm:px-6">© {new Date().getFullYear()} JTP Logistics</div>
      </footer>
    </div>
  );
}
