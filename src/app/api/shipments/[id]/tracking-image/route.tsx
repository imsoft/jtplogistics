import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { BRAND } from "@/lib/email-layout";
import { trackingCard, trackingFileName } from "@/lib/shipment-tracking";

/**
 * GET /api/shipments/:id/tracking-image — imagen cuadrada (1080 × 1080, para
 * WhatsApp) con el seguimiento del embarque y la imagen de JTP. La ven
 * dirección, soporte de TI y colaboradores con permiso de ver embarques.
 */

const SIZE = 1080;

// Geist (la letra de la plataforma) normal y en negritas. Si no se pueden
// bajar, next/og usa su Geist normal (sin negritas).
type Fonts = { regular: ArrayBuffer; bold: ArrayBuffer };
let fontsPromise: Promise<Fonts | null> | null = null;

function googleFont(weight: number): Promise<ArrayBuffer> {
  return fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`)
    .then((r) => r.text())
    .then((css) => {
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!url) throw new Error("Sin fuente");
      return fetch(url).then((r) => r.arrayBuffer());
    });
}

function loadFonts(): Promise<Fonts | null> {
  fontsPromise ??= Promise.all([googleFont(400), googleFont(700)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch(() => null);
  return fontsPromise.then((f) => {
    if (!f) fontsPromise = null; // Se reintenta en la siguiente imagen.
    return f;
  });
}

// El logo se incrusta como data URL: next/og no deja cargar imágenes de la
// misma máquina (protección SSRF) y así tampoco depende de la red al dibujar.
let logoPromise: Promise<string> | null = null;
function loadLogo(requestUrl: string): Promise<string> {
  logoPromise ??= fetch(new URL("/images/logo/jtp-logistics.png", requestUrl))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("Sin logo"))))
    .then((buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`)
    .catch((e) => {
      logoPromise = null;
      throw e;
    });
  return logoPromise;
}

async function canSee(): Promise<boolean> {
  const session = await requireSession();
  const role = session.user.role;
  if (role === "admin" || role === "developer") return true;
  if (role !== "collaborator") return false;
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { canViewShipments: true } });
  return Boolean(me?.canViewShipments);
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: wide ? "100%" : "50%", padding: "14px 0", borderBottom: `2px solid ${BRAND.border}` }}>
      <div style={{ fontSize: 20, color: BRAND.muted, letterSpacing: 1.5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: BRAND.text, marginTop: 4, paddingRight: 16 }}>{value.toUpperCase()}</div>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await canSee())) return Response.json({ error: "Sin permiso" }, { status: 403 });
    const { id } = await params;
    const s = await prisma.shipment.findUnique({
      where: { id },
      select: { eco: true, client: true, origin: true, destination: true, pickupDate: true, deliveryDate: true, operatorName: true, status: true, cartaPorte: true },
    });
    if (!s) return Response.json({ error: "No encontrado" }, { status: 404 });

    const c = trackingCard(s);
    const logo = await loadLogo(request.url);
    const today = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" }).format(new Date());
    const fonts = await loadFonts();

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#FFFFFF", fontFamily: "Geist" }}>
          <div style={{ height: 16, backgroundColor: BRAND.blue, display: "flex" }} />

          {/* Encabezado: logo y título */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px 20px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og necesita <img> */}
            <img src={logo} width={190} height={190} style={{ margin: "-30px 0 -30px -20px" }} alt="" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 56, fontWeight: 700, color: BRAND.blue, letterSpacing: 1 }}>SEGUIMIENTO JTP</div>
              <div style={{ fontSize: 24, color: BRAND.muted, marginTop: 4 }}>{today.toUpperCase()}</div>
            </div>
          </div>

          {/* Tarjeta del embarque */}
          <div style={{ display: "flex", flexDirection: "column", margin: "0 56px", padding: "28px 36px", borderRadius: 24, backgroundColor: BRAND.background, flexGrow: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 22, color: BRAND.muted, letterSpacing: 1.5 }}>CLIENTE</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: BRAND.text }}>{c.client.toUpperCase()}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: 22, color: BRAND.muted, letterSpacing: 1.5 }}>ECO</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: BRAND.blue }}>{c.eco.toUpperCase()}</div>
              </div>
            </div>

            {/* Ruta */}
            <div style={{ display: "flex", alignItems: "center", marginTop: 22, padding: "20px 28px", borderRadius: 18, backgroundColor: "#FFFFFF" }}>
              <div style={{ display: "flex", flexDirection: "column", width: "44%" }}>
                <div style={{ fontSize: 20, color: BRAND.muted, letterSpacing: 1.5 }}>ORIGEN</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: BRAND.text }}>{c.origin.toUpperCase()}</div>
              </div>
              <div style={{ display: "flex", width: "12%", justifyContent: "center", fontSize: 44, color: BRAND.blue }}>→</div>
              <div style={{ display: "flex", flexDirection: "column", width: "44%", alignItems: "flex-end" }}>
                <div style={{ fontSize: 20, color: BRAND.muted, letterSpacing: 1.5 }}>DESTINO</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: BRAND.text, textAlign: "right" }}>{c.destination.toUpperCase()}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 8 }}>
              <Field label="Destino final cliente" value={c.finalDestination} wide />
              <Field label="Fecha de carga" value={c.pickupDate} />
              <Field label="Fecha de entrega" value={c.deliveryDate} />
              <Field label="Hora de entrega" value={c.deliveryTime} />
              <Field label="Operador" value={c.operator} />
            </div>

            {/* Comentario: el estado del embarque */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", paddingTop: 20 }}>
              <div style={{ fontSize: 20, color: BRAND.muted, letterSpacing: 1.5 }}>ESTATUS</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 8,
                  padding: "18px 24px",
                  borderRadius: 16,
                  // Sólido, para que resalte como el amarillo de su Excel.
                  backgroundColor: c.status.fg,
                  color: "#FFFFFF",
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {c.status.label.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Pie */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 56px 26px", fontSize: 22, color: BRAND.muted }}>
            <div style={{ display: "flex" }}>JTP LOGISTICS · EL MEJOR SOCIO COMERCIAL</div>
            <div style={{ display: "flex", color: BRAND.blue, fontWeight: 700 }}>JTP.COM.MX</div>
          </div>
        </div>
      ),
      {
        width: SIZE,
        height: SIZE,
        ...(fonts
          ? {
              fonts: [
                { name: "Geist", data: fonts.regular, weight: 400 as const, style: "normal" as const },
                { name: "Geist", data: fonts.bold, weight: 700 as const, style: "normal" as const },
              ],
            }
          : {}),
        headers: {
          "Content-Disposition": `attachment; filename="${trackingFileName(s.eco)}"`,
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "No se pudo generar la imagen." }, { status: 500 });
  }
}
