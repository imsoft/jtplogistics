import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Info, Lock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/manual/print-button";
import { getSession } from "@/lib/auth-server";
import { cn } from "@/lib/utils";

/**
 * Manual del proveedor de transporte. Es la única fuente: lo que se cambie
 * aquí es lo que ve el proveedor, y el PDF sale de imprimir esta misma página
 * (ver docs/manual-proveedor/). Pública a propósito: el enlace se manda junto
 * con los accesos, antes de que el proveedor haya entrado nunca.
 */

export const metadata: Metadata = {
  title: "Manual del proveedor | JTP Logistics",
  description:
    "Cómo registrar tus tarifas por ruta, entender el semáforo y trabajar con JTP Logistics desde la plataforma.",
  // Las capturas muestran rutas reales del catálogo: que no la indexen.
  robots: { index: false, follow: false },
};

/** Súbela cada vez que cambie el contenido: el proveedor la ve arriba. */
const UPDATED_AT = "28 de septiembre de 2026";

const PANEL_BY_ROLE: Record<string, string> = {
  carrier: "/carrier/dashboard",
  admin: "/admin/dashboard",
  collaborator: "/collaborator/dashboard",
  vendor: "/vendor/dashboard",
  developer: "/developer/dashboard",
};

const SECTIONS = [
  { id: "entrar", title: "Cómo entrar" },
  { id: "panel", title: "Qué hay en tu panel" },
  { id: "tarifas", title: "Registrar tus tarifas" },
  { id: "semaforo", title: "El semáforo" },
  { id: "rojo", title: "Si una ruta sale en rojo" },
  { id: "candado", title: "Por qué se bloquea tu tarifa" },
  { id: "equipo", title: "Dar acceso a tu equipo" },
  { id: "sugerencias", title: "Proponer rutas nuevas" },
  { id: "mensajes", title: "Mensajes con JTP" },
  { id: "perfil", title: "Los datos de tu empresa" },
  { id: "preguntas", title: "Preguntas frecuentes" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const index = SECTIONS.findIndex((s) => s.id === id);
  return (
    <section id={id} className="scroll-mt-24 space-y-4 print:scroll-mt-0">
      <h2 className="flex items-center gap-3 border-b-2 border-primary/80 pb-2 text-lg font-bold tracking-wide text-primary break-after-avoid sm:text-xl">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {index + 1}
        </span>
        {SECTIONS[index].title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-7 text-foreground/90">{children}</p>;
}

function Captura({
  src,
  alt,
  caption,
  width = 2720,
  height = 1800,
  narrow = false,
}: {
  src: string;
  alt: string;
  caption: React.ReactNode;
  width?: number;
  height?: number;
  narrow?: boolean;
}) {
  return (
    <figure className={cn("break-inside-avoid space-y-2", narrow && "mx-auto max-w-sm")}>
      <Image
        src={`/images/manual-proveedor/${src}`}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 760px, 100vw"
        className="w-full rounded-lg border shadow-sm"
      />
      <figcaption className="text-xs leading-5 text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

function Pasos({ children }: { children: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {children.map((child, i) => (
        <li key={i} className="flex gap-3 text-sm leading-6">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          <span className="pt-px">{child}</span>
        </li>
      ))}
    </ol>
  );
}

function Nota({
  tipo = "info",
  children,
}: {
  tipo?: "info" | "aviso";
  children: React.ReactNode;
}) {
  const Icon = tipo === "info" ? Info : TriangleAlert;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm leading-6 break-inside-avoid",
        tipo === "info"
          ? "border-primary/20 bg-primary/5"
          : "border-amber-300/70 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tipo === "info" ? "text-primary" : "text-amber-600 dark:text-amber-400"
        )}
      />
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Tabla({ head, rows }: { head: [string, string]; rows: [string, React.ReactNode][] }) {
  return (
    <div className="overflow-hidden rounded-lg border break-inside-avoid">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-primary">
          <tr>
            <th className="w-2/5 px-4 py-2.5 font-semibold sm:w-1/3">{head[0]}</th>
            <th className="px-4 py-2.5 font-semibold">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t align-top">
              <td className="px-4 py-3 font-semibold">{label}</td>
              <td className="px-4 py-3 leading-6 text-foreground/90">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SEMAFORO = [
  {
    color: "Verde",
    dot: "bg-green-500",
    ring: "border-green-500/30 bg-green-50 dark:bg-green-500/10",
    meaning: "Tu tarifa está dentro del objetivo de JTP.",
    action: "Nada. Estás en posición de competir por esa carga.",
  },
  {
    color: "Amarillo",
    dot: "bg-yellow-400",
    ring: "border-yellow-400/40 bg-yellow-50 dark:bg-yellow-500/10",
    meaning: "Tu tarifa está ligeramente arriba del objetivo.",
    action: "Sigues cerca. Si puedes ajustar, mejoras tu posición.",
  },
  {
    color: "Rojo",
    dot: "bg-red-500",
    ring: "border-red-500/30 bg-red-50 dark:bg-red-500/10",
    meaning: "Tu tarifa está arriba del objetivo de JTP.",
    action: "Habla con pricing o pide el desbloqueo para corregirla.",
  },
];

const PREGUNTAS: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Puedo ver cuánto paga JTP en cada ruta?",
    a: "No. La plataforma solo te muestra el color del semáforo, nunca el precio objetivo de JTP ni el porcentaje de diferencia.",
  },
  {
    q: "Me equivoqué al escribir mi tarifa y ya guardé. ¿Qué hago?",
    a: (
      <>
        Si la ruta salió en rojo, usa <strong>Solicitar desbloqueo</strong> en ese mismo renglón.
        En cualquier otro caso, escríbele a JTP desde <strong>Mensajes</strong> y pide que te
        desbloqueen la ruta.
      </>
    ),
  },
  {
    q: "¿El volumen es por semana o por mes?",
    a: "Por mes. Es el número de viajes que puedes dar en esa ruta en un mes.",
  },
  {
    q: "Manejo varios tipos de unidad. ¿Capturo todo junto?",
    a: "No. Cada tipo de unidad tiene su propia lista y su propia tarifa. Repite la captura en cada uno: una misma ruta puede tener tarifa distinta en caja seca y en plataforma.",
  },
  {
    q: "Una ruta me dice que contacte al encargado de compras. ¿Por qué?",
    a: "Porque esa ruta todavía no está activa en el catálogo de JTP. Da clic en el enlace del renglón y te lleva a la conversación para preguntar por ella.",
  },
  {
    q: "¿Puedo entrar desde el celular?",
    a: "Sí. La plataforma se adapta a la pantalla del teléfono; solo entra a la misma dirección desde el navegador.",
  },
  {
    q: "Olvidé mi contraseña.",
    a: (
      <>
        En la pantalla de acceso da clic en <strong>¿Olvidaste tu contraseña?</strong>. Te llega
        un enlace a tu correo para poner una nueva.
      </>
    ),
  },
  {
    q: "Cambió la persona que lleva esto en mi empresa.",
    a: (
      <>
        Dale su acceso desde <strong>Usuarios</strong> y quítale el acceso a quien ya no trabaja
        ahí. Si quien se fue era el usuario principal, avísale a JTP para hacer el cambio.
      </>
    ),
  },
];

// ─── Página ──────────────────────────────────────────────────────────────────

export default async function ManualProveedorPage() {
  // Sin sesión es lo normal aquí; con sesión, el botón lleva a su panel.
  const session = await getSession().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const panelHref = role ? PANEL_BY_ROLE[role] : undefined;
  const cta = panelHref
    ? { href: panelHref, label: "Ir a mi panel" }
    : { href: "/login", label: "Iniciar sesión" };

  return (
    <div className="min-h-screen bg-background print:normal-case">
      {/* Márgenes del PDF cuando se imprime la página. */}
      <style>{`@media print { @page { size: A4; margin: 14mm 12mm 16mm; } }`}</style>

      {/* ── Barra superior ── */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="JTP Logistics">
            <Image
              src="/images/logo/jtp-logistics.png"
              alt="JTP Logistics"
              width={160}
              height={160}
              className="h-14 w-auto"
              priority
            />
          </Link>
          <span className="hidden truncate text-sm font-semibold tracking-wide text-muted-foreground sm:block">
            Manual del proveedor
          </span>
          <div className="ml-auto flex items-center gap-2">
            <PrintButton className="hidden md:inline-flex" />
            <Button size="sm" asChild>
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Portada ── */}
      <div
        className="border-b print:border-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% -20%, oklch(0.92 0.04 264.376 / 0.45) 0%, transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 print:py-6">
          <Image
            src="/images/logo/jtp-logistics.png"
            alt="JTP Logistics"
            width={160}
            height={160}
            className="mb-6 hidden h-24 w-auto print:block"
          />
          <p className="text-xs font-semibold tracking-widest text-primary">
            Plataforma de proveedores
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Manual del proveedor de transporte
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            Cómo registrar tus tarifas por ruta, entender el semáforo y trabajar con JTP Logistics
            desde la plataforma.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 print:hidden">
            <Button size="lg" asChild>
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#tarifas">Ver cómo registrar tus tarifas</a>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Última actualización: {UPDATED_AT}
          </p>

          {/* Los tres pasos, para quien solo lee esto. */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3 break-inside-avoid">
            {[
              { t: "Entra", d: "Con el correo y la contraseña que te envió JTP." },
              {
                t: "Elige tu tipo de unidad",
                d: "Caja seca, refrigerada, plataforma… y marca las rutas que sí operas.",
              },
              { t: "Escribe tarifa y volumen", d: "En cada ruta, y guarda. El semáforo te dice cómo quedaste." },
            ].map((step, i) => (
              <div key={step.t} className="flex gap-4 rounded-xl border bg-card p-4 shadow-xs sm:block sm:p-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold sm:mt-4">{step.t}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Índice + contenido ── */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14 print:block print:break-before-page print:py-0">
        <nav aria-label="Contenido" className="hidden lg:block print:hidden">
          <div className="sticky top-24 space-y-1">
            <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground">
              Contenido
            </p>
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex gap-2 rounded-md px-2 py-1.5 text-xs leading-5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="w-4 shrink-0 text-right font-semibold text-primary">{i + 1}</span>
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-14 print:max-w-none print:space-y-10">
          <Section id="entrar">
            <P>
              Abre <strong>www.jtplogistics.com/login</strong> desde cualquier navegador, en
              computadora o en celular. Usa el correo y la contraseña que vienen en el mensaje de
              invitación.
            </P>
            <Captura
              src="01-login.png"
              width={1200}
              height={1320}
              narrow
              alt="Pantalla de inicio de sesión"
              caption="Pantalla de acceso. El ojito del lado derecho te deja ver la contraseña mientras la escribes."
            />
            <h3 className="pt-2 text-sm font-bold">Si no recuerdas tu contraseña</h3>
            <P>
              Da clic en <strong>¿Olvidaste tu contraseña?</strong>, escribe tu correo y te llegará
              un enlace para poner una nueva. El enlace llega al mismo correo con el que entras.
            </P>
            <Nota tipo="aviso">
              <p>
                <strong>Tu acceso es personal.</strong> Si alguien más de tu empresa necesita entrar,
                no le pases tu contraseña: dale su propio usuario desde la sección{" "}
                <strong>Usuarios</strong>. Así cada movimiento queda con el nombre de quien lo hizo.
              </p>
            </Nota>
          </Section>

          <Section id="panel">
            <P>El menú de la izquierda tiene todo lo que necesitas:</P>
            <Tabla
              head={["Sección", "Para qué sirve"]}
              rows={[
                ["Inicio", "El resumen de todas las rutas que ya registraste, con tu tarifa y tu volumen."],
                ["Tipos de unidades", "Donde eliges rutas y capturas tus tarifas. Una lista por cada tipo de unidad."],
                ["Sugerencias", "Para proponerle a JTP rutas que no están en el catálogo."],
                ["Mensajes", "Conversación directa con el equipo de JTP."],
                ["Perfil", "Los datos de tu empresa: razón social, RFC, domicilio y contactos."],
                ["Usuarios", "Para dar acceso a más gente de tu empresa. Solo la ve el usuario principal."],
                ["Manual", "Esta guía, siempre en su versión más reciente."],
              ]}
            />
            <Captura
              src="02-inicio.png"
              alt="Pantalla de inicio del proveedor"
              caption={
                <>
                  Inicio: cuántas rutas tienes registradas y el detalle de cada una. El botón{" "}
                  <strong>Gestionar</strong> de cada renglón te lleva a editarla.
                </>
              }
            />
          </Section>

          <Section id="tarifas">
            <P>
              Entra a <strong>Tipos de unidades</strong> y elige el tipo con el que trabajas. Cada
              tipo de unidad tiene su propia lista de rutas: si mueves caja seca y plataforma,
              capturas en las dos.
            </P>
            <Pasos>
              {[
                <>Palomea la casilla de la izquierda en cada ruta que sí operas.</>,
                <>
                  En <strong>Mi target</strong> escribe tu tarifa por viaje, en pesos.
                </>,
                <>
                  En <strong>Vol./mes</strong> escribe cuántos viajes al mes puedes dar en esa ruta.
                </>,
                <>
                  Baja hasta el final y da clic en <strong>Guardar selección</strong>.
                </>,
              ]}
            </Pasos>
            <P>
              Las rutas vienen agrupadas por ciudad de origen. Si la lista es larga, usa los filtros
              de <strong>Origen</strong> y <strong>Destino</strong>, o el filtro{" "}
              <strong>Rutas</strong> para ver solo las que ya pactaste o solo las que te faltan.
            </P>
            <Captura
              src="03-capturar.png"
              alt="Selección de rutas y captura de tarifas"
              caption={
                <>
                  Marca la ruta, escribe tu tarifa y tu volumen. El botón azul{" "}
                  <strong>Ir a guardar</strong> te baja directo al final de la lista.
                </>
              }
            />
            <Nota>
              <p>
                Debajo del volumen a veces aparece <strong>“JTP: 20”</strong>. Ese es el volumen
                mensual que JTP maneja en esa ruta; te sirve de referencia para saber cuánto te puede
                tocar.
              </p>
              <p>
                Nada se guarda hasta que das clic en <strong>Guardar selección</strong>. Si sales
                antes, se pierde lo capturado.
              </p>
            </Nota>
          </Section>

          <Section id="semaforo">
            <P>
              Ya que guardaste, entra desde <strong>Inicio</strong> y da clic en{" "}
              <strong>Gestionar</strong> en cualquiera de tus rutas. Ahí aparece la columna{" "}
              <strong>Semáforo</strong>: un color por ruta que compara tu tarifa contra el objetivo
              que JTP tiene para esa ruta.
            </P>
            <div className="grid gap-3 sm:grid-cols-3 break-inside-avoid">
              {SEMAFORO.map((s) => (
                <div key={s.color} className={cn("rounded-xl border p-4", s.ring)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("size-4 rounded-full shadow-inner", s.dot)} aria-hidden />
                    <span className="text-sm font-bold">{s.color}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{s.meaning}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{s.action}</p>
                </div>
              ))}
            </div>
            <Captura
              src="04-semaforo.png"
              alt="Rutas con el semáforo en verde, amarillo y rojo"
              caption="Tus rutas con el semáforo. En la ruta en rojo aparecen las dos opciones que tienes: contactar a pricing o solicitar el desbloqueo."
            />
            <Nota tipo="aviso">
              <p>
                <strong>El semáforo no te muestra el precio de JTP.</strong> Solo te dice el color.
                Tampoco verás porcentajes ni el objetivo exacto: esa información es interna de JTP.
              </p>
              <p>
                El color refleja <strong>lo que ya está guardado</strong>. Mientras escribes una
                tarifa nueva, el semáforo se apaga y vuelve a aparecer cuando guardas.
              </p>
            </Nota>
          </Section>

          <Section id="rojo">
            <P>
              Rojo no significa que quedaste fuera. Significa que tu tarifa quedó arriba de lo que
              JTP busca en esa ruta. Tienes dos caminos, los dos aparecen en el mismo renglón:
            </P>
            <div className="grid gap-3 sm:grid-cols-2 break-inside-avoid">
              <div className="rounded-xl border p-4">
                <p className="text-sm font-bold">Contactar a pricing de JTP</p>
                <p className="mt-2 text-sm leading-6 text-foreground/90">
                  Se abre la conversación con el mensaje ya escrito, mencionando la ruta. Úsalo
                  cuando quieras explicar por qué tu tarifa es esa: casetas, regreso vacío,
                  maniobras, lo que aplique.
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm font-bold">Solicitar desbloqueo</p>
                <p className="mt-2 text-sm leading-6 text-foreground/90">
                  Le pide permiso a JTP para volver a editar esa tarifa. Cuando la autoricen, verás{" "}
                  <em>“Desbloqueo aprobado por JTP”</em> en la ruta, y ahí puedes corregirla y
                  guardar otra vez.
                </p>
              </div>
            </div>
          </Section>

          <Section id="candado">
            <div className="flex gap-3">
              <Lock className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <P>
                En cuanto guardas una ruta, <strong>la tarifa queda bloqueada</strong>. Es a
                propósito: la tarifa es un compromiso y JTP necesita que sea estable para poder
                cotizarle a sus clientes.
              </P>
            </div>
            <P>Con la ruta ya guardada sí puedes, sin pedir permiso:</P>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
              <li>
                Actualizar tu <strong>volumen mensual</strong> cuando cambie tu disponibilidad.
              </li>
              <li>
                <strong>Agregar rutas nuevas</strong> y capturarles su tarifa.
              </li>
            </ul>
            <P>
              Para cambiar la tarifa de una ruta ya guardada, usa <strong>Solicitar desbloqueo</strong>{" "}
              o habla con tu contacto en JTP.
            </P>
          </Section>

          <Section id="equipo">
            <P>
              Si quieres que alguien más de tu empresa capture o responda mensajes, dale su propio
              acceso desde <strong>Usuarios</strong>. Escribe su nombre y su correo, palomea lo que
              quieres que pueda hacer y da clic en <strong>Dar acceso</strong>. Le llega un correo
              con una contraseña temporal.
            </P>
            <Tabla
              head={["Permiso", "Qué le permite"]}
              rows={[
                ["Tarifas: ver", "Consultar las rutas y lo que la empresa tiene capturado, sin modificar nada."],
                ["Tarifas: capturar", "Poner tarifa y volumen. Incluye ver."],
                ["Mensajes con JTP", "Ver y responder la conversación de la empresa."],
                ["Sugerencias de rutas", "Proponer rutas nuevas a nombre de la empresa."],
                ["Datos de la empresa", "Editar razón social, RFC, domicilio y contactos."],
              ]}
            />
            <Captura
              src="08-usuarios.png"
              alt="Pantalla de usuarios de la empresa"
              caption="Cada persona entra con su propio correo, y lo que haga queda con su nombre en el registro."
            />
            <P>
              La sección <strong>Usuarios</strong> solo la ve el usuario principal de tu empresa:
              dar accesos no se delega. Si alguien se va de la empresa, desde ahí mismo le quitas el
              acceso.
            </P>
          </Section>

          <Section id="sugerencias">
            <P>
              ¿Corres una ruta que no aparece en el catálogo? Entra a <strong>Sugerencias</strong>,
              da clic en <strong>Nueva sugerencia</strong> y descríbela: origen, destino y con qué
              unidad la operas. El equipo de JTP la revisa y, si la dan de alta, te aparecerá para
              capturarle tarifa.
            </P>
            <Captura
              src="05-sugerencia.png"
              alt="Formulario de nueva sugerencia"
              caption="Entre más claro el origen y el destino, más rápido la revisan."
            />
          </Section>

          <Section id="mensajes">
            <P>
              En <strong>Mensajes</strong> tienes la conversación directa con el equipo de JTP:
              dudas de una ruta, de tu tarifa o de la plataforma. Es el canal recomendado, porque
              queda registrado y lo puede ver quien te atienda.
            </P>
            <Captura
              src="06-mensajes.png"
              alt="Pantalla de mensajes"
              caption="La conversación es de tu empresa: cada mensaje sale con el nombre de quien lo escribió."
            />
          </Section>

          <Section id="perfil">
            <P>
              En <strong>Perfil</strong> mantén al día la razón social, el RFC, el domicilio y los
              contactos de tu empresa. Esos datos son los que JTP usa para darte de alta como
              proveedor y para la facturación, así que vale la pena revisarlos desde el primer día.
            </P>
            <Captura
              src="07-perfil.png"
              alt="Pantalla de perfil de la empresa"
              caption="Puedes registrar varios contactos, cada uno con su puesto, teléfonos y correos."
            />
          </Section>

          <Section id="preguntas">
            <div className="divide-y rounded-lg border">
              {PREGUNTAS.map((item) => (
                <details key={item.q} className="group break-inside-avoid px-4 py-3" open>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 print:hidden"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          {/* ── Cierre ── */}
          <div className="rounded-2xl bg-primary px-6 py-8 text-primary-foreground sm:px-10 sm:py-10 print:hidden">
            <p className="text-xl font-bold sm:text-2xl">¿Listo para registrar tus tarifas?</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/85">
              Entra con el correo y la contraseña que te envió JTP. Si tienes dudas, escríbenos desde
              la sección Mensajes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link href={cta.href}>
                  {cta.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {!panelHref && (
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary-foreground/90 underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
            </div>
          </div>

          <div className="hidden rounded-lg border p-5 text-sm leading-6 print:block">
            <p className="font-bold">¿Necesitas ayuda?</p>
            <p>
              Entra en www.jtplogistics.com/login y escríbenos desde la sección Mensajes. La versión
              más reciente de este manual está en www.jtplogistics.com/manual-proveedor.
            </p>
          </div>
        </article>
      </div>

      <footer className="border-t print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>JTP Logistics · El mejor socio comercial</span>
          <PrintButton className="md:hidden" />
        </div>
      </footer>
    </div>
  );
}
