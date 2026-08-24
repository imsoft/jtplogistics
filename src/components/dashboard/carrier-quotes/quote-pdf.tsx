"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { QuoteData } from "@/types/carrier-quote.types";
import { renderLexicalContent } from "@/lib/utils/lexical-to-pdf";
import { titleCase } from "@/lib/utils";

const BRAND = "#2D4EAA";       // oklch(0.488 0.243 264) → JTP primary blue
const BRAND_LIGHT = "#EBF0FB"; // very light tint for alternating rows
const WHITE = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#6B7280";
const LINE = "#C8D5EE";        // subtle blue-gray for dividers

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 18, paddingBottom: 30, paddingHorizontal: 36 },
  // ── Header ──
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2, paddingBottom: 0 },
  // El PNG del logo es cuadrado (3200x3200): con una caja apaisada, objectFit
  // "contain" lo encogía a la altura y dejaba el ancho vacío.
  logo: { width: 106, height: 106, objectFit: "contain" },
  headerDate: { fontSize: 8, color: MUTED, fontFamily: "Helvetica", textAlign: "right", maxWidth: 200 },
  // ── Page 1 title ──
  titleWrapper: { borderBottomWidth: 1, borderColor: BRAND, paddingVertical: 4, marginBottom: 6 },
  titleText: { color: BRAND, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  // ── Company info ──
  companyRow: { flexDirection: "row", marginBottom: 3 },
  companyLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, width: 60 },
  companyValue: { fontSize: 9 },
  // ── Quote number ──
  quoteNumWrapper: { borderBottomWidth: 0.8, borderColor: BRAND, paddingVertical: 5, marginBottom: 0 },
  quoteNumText: { color: BRAND, fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  // ── Table ──
  table: { marginBottom: 10 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1.2, borderBottomColor: BRAND },
  tableHeadCell: { color: BRAND, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 5, paddingHorizontal: 10, flex: 1, letterSpacing: 0.4 },
  tableHeadCellLast: { color: BRAND, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 5, paddingHorizontal: 10, flex: 1.5, letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 8.5, paddingVertical: 3, paddingHorizontal: 10, flex: 1, color: TEXT },
  tableCellLast: { fontSize: 8.5, paddingVertical: 3, paddingHorizontal: 10, flex: 1.5, color: TEXT },
  // ── Terms / misc ──
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", textDecoration: "underline", marginBottom: 4, marginTop: 4 },
  validity: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", textDecoration: "underline", marginTop: 5, marginBottom: 4 },
  // ── Signatures ──
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 0 },
  sigColumn: { width: "45%" },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 10, textAlign: "center" },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, marginBottom: 4 },
  sigName: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  // ── Page title (pages 2-4) ──
  pageTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 12, letterSpacing: 1 },
  // ── Footer ──
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontSize: 8, color: MUTED, textAlign: "center", fontFamily: "Helvetica" },
});

const lexStyles = {
  body: { fontSize: 7, color: TEXT, fontFamily: "Helvetica" },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  heading: { fontSize: 9 },
  bulletRow: { flexDirection: "row" as const, marginBottom: 1 },
  bulletDot: { fontSize: 7, marginRight: 4, width: 10, fontFamily: "Helvetica" },
};

function formatDateEs(date: Date): string {
  const days = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}, Guadalajara, Jalisco`;
}

function formatValidUntilEs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  return `VIGENCIA AL ${d} DE ${months[m - 1]} DEL ${y}`;
}

function PageHeader({ logoUrl, date }: { logoUrl: string; date: string }) {
  return (
    <View style={s.header} fixed>
      <Image src={logoUrl} style={s.logo} />
      <Text style={s.headerDate}>{date}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>jtp.com.mx</Text>
    </View>
  );
}

/**
 * Zona de firmas. A la izquierda firma JTP: el nombre y el puesto son SIEMPRE
 * los de quien creó la cotización, nunca se rellenan con los de otra persona.
 * A la derecha firma el cliente, con el nombre del contacto de la cotización.
 */
function Signatures({
  creatorName,
  creatorPosition,
  contactName,
}: {
  creatorName?: string;
  creatorPosition?: string;
  contactName?: string;
}) {
  return (
    // Las firmas viajan juntas: sin esto las líneas se quedan en una página
    // y los nombres saltan a la siguiente.
    <View wrap={false}>
      <View style={s.sigBlock}>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ATENTAMENTE</Text>
          <View style={s.sigLine} />
          {creatorName ? (
            <Text style={s.sigName}>{creatorName}</Text>
          ) : null}
          {creatorPosition ? (
            <Text style={{ fontSize: 8, color: MUTED, textAlign: "center" }}>
              {/* El puesto se guarda en mayúsculas; en la firma va en minúsculas.
                  Se transforma en JS porque react-pdf no aplica text-transform. */}
              {creatorPosition.toLowerCase()}
            </Text>
          ) : null}
        </View>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ACEPTAMOS COTIZACION</Text>
          <View style={s.sigLine} />
          {contactName ? <Text style={s.sigName}>{titleCase(contactName)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export interface QuoteTermsJson {
  bulletsJson: string;
  contractJson: string;
  privacyJson: string;
  limitsJson: string;
}

interface Props {
  data: QuoteData;
  logoUrl: string;
  termsJson: QuoteTermsJson;
  /** Nombre de quien creó la cotización (aparece en la zona de firmas). */
  creatorName?: string;
  /** Puesto de quien creó la cotización (aparece bajo su nombre). */
  creatorPosition?: string;
}

export function QuotePdf({ data, logoUrl, termsJson, creatorName, creatorPosition }: Props) {
  const today = new Date();
  const dateStr = formatDateEs(today);
  const rowBg = (i: number) => (i % 2 === 0 ? BRAND_LIGHT : WHITE);

  return (
    <Document title={`Cotizacion-${data.quoteNumber}`}>
      {/* ── Página 1: Cotización ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        <View style={s.titleWrapper}>
          <Text style={s.titleText}>Propuesta de servicio Nacional / Internacional</Text>
        </View>
        <View style={[s.companyRow, { marginBottom: 2 }]}>
          <Text style={s.companyLabel}>Compañía:</Text>
          <Text style={s.companyValue}>{data.company}</Text>
        </View>
        <View style={[s.companyRow, { marginBottom: 2 }]}>
          <Text style={s.companyLabel}>Contacto:</Text>
          {/* El contacto sale con la inicial de cada palabra en mayúscula,
              se haya capturado como se haya capturado. */}
          <Text style={s.companyValue}>{titleCase(data.contact)}</Text>
        </View>
        {data.phone ? (
          <View style={[s.companyRow, { marginBottom: 2 }]}>
            <Text style={s.companyLabel}>Teléfono:</Text>
            <Text style={s.companyValue}>{data.phone}</Text>
          </View>
        ) : null}
        {data.email ? (
          <View style={[s.companyRow, { marginBottom: 10 }]}>
            <Text style={s.companyLabel}>Correo:</Text>
            <Text style={s.companyValue}>{data.email}</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 10 }} />
        )}
        <View style={s.quoteNumWrapper}>
          <Text style={s.quoteNumText}>N O . &nbsp; C O T I Z A C I O N &nbsp; {data.quoteNumber}</Text>
        </View>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.tableHeadCell}>Origen</Text>
            <Text style={s.tableHeadCell}>Destino</Text>
            <Text style={s.tableHeadCell}>Estado</Text>
            <Text style={s.tableHeadCell}>Costo</Text>
            <Text style={s.tableHeadCellLast}>UNIDAD</Text>
          </View>
          {data.rows.map((row, i) => (
            <View key={i} wrap={false} style={[s.tableRow, { backgroundColor: rowBg(i) }]}>
              <Text style={s.tableCell}>{row.origin}</Text>
              <Text style={s.tableCell}>{row.destination}</Text>
              <Text style={s.tableCell}>{row.destinationState ?? ""}</Text>
              <Text style={s.tableCell}>${Number(row.cost).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={s.tableCellLast}>{row.unitLabel}</Text>
            </View>
          ))}
        </View>
        <Text style={s.termsTitle}>TERMINOS Y CONDICIONES</Text>
        {/* Las viñetas fluyen y se reparten entre páginas si hace falta: si se
            agrupan con las firmas, una tabla larga manda todo el bloque a la
            hoja siguiente y deja la primera a medias. */}
        {renderLexicalContent(termsJson.bulletsJson, lexStyles)}
        <Text style={s.validity}>{formatValidUntilEs(data.validUntil)}</Text>
        <Signatures
          creatorName={creatorName}
          creatorPosition={creatorPosition}
          contactName={data.contact}
        />
      </Page>

      {/* ── Página 2: Términos del contrato ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        <Text style={s.pageTitle}>TERMINOS INSERTOS EN EL CONTRATO</Text>
        {renderLexicalContent(termsJson.contractJson, lexStyles)}
        <Signatures
          creatorName={creatorName}
          creatorPosition={creatorPosition}
          contactName={data.contact}
        />
      </Page>

      {/* ── Página 3: Aviso de privacidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        <Text style={s.pageTitle}>AVISO DE PRIVACIDAD</Text>
        {renderLexicalContent(termsJson.privacyJson, lexStyles)}
        <Signatures
          creatorName={creatorName}
          creatorPosition={creatorPosition}
          contactName={data.contact}
        />
      </Page>

      {/* ── Página 4: Límites de responsabilidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        {renderLexicalContent(termsJson.limitsJson, lexStyles)}
        <Signatures
          creatorName={creatorName}
          creatorPosition={creatorPosition}
          contactName={data.contact}
        />
      </Page>
    </Document>
  );
}
