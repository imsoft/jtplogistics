"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { QuoteData } from "@/types/carrier-quote.types";
import { renderLexicalContent } from "@/lib/utils/lexical-to-pdf";

const BRAND = "#2D4EAA";       // oklch(0.488 0.243 264) → JTP primary blue
const BRAND_LIGHT = "#EBF0FB"; // very light tint for alternating rows
const WHITE = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#6B7280";
const LINE = "#C8D5EE";        // subtle blue-gray for dividers

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 28, paddingBottom: 56, paddingHorizontal: 36 },
  // ── Header ──
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 10 },
  logo: { width: 280, height: 112, objectFit: "contain" },
  headerDate: { fontSize: 8, color: MUTED, fontFamily: "Helvetica", textAlign: "right", maxWidth: 200 },
  // ── Page 1 title ──
  titleWrapper: { borderBottomWidth: 1, borderColor: BRAND, paddingVertical: 7, marginBottom: 12 },
  titleText: { color: BRAND, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  // ── Company info ──
  companyRow: { flexDirection: "row", marginBottom: 4 },
  companyLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, width: 60 },
  companyValue: { fontSize: 9 },
  // ── Quote number ──
  quoteNumWrapper: { borderBottomWidth: 0.8, borderColor: BRAND, paddingVertical: 6, marginBottom: 0 },
  quoteNumText: { color: BRAND, fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  // ── Table ──
  table: { marginBottom: 14 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1.2, borderBottomColor: BRAND },
  tableHeadCell: { color: BRAND, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 7, paddingHorizontal: 10, flex: 1, letterSpacing: 0.4 },
  tableHeadCellLast: { color: BRAND, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 7, paddingHorizontal: 10, flex: 1.5, letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 10, flex: 1, color: TEXT },
  tableCellLast: { fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 10, flex: 1.5, color: TEXT },
  // ── Terms / misc ──
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", textDecoration: "underline", marginBottom: 8, marginTop: 10 },
  validity: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", textDecoration: "underline", marginTop: 10, marginBottom: 10 },
  // ── Signatures ──
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 8 },
  sigColumn: { width: "45%" },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 20, textAlign: "center" },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, marginBottom: 4 },
  sigName: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  // ── Page title (pages 2-4) ──
  pageTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 12, letterSpacing: 1 },
  // ── Footer ──
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontSize: 8, color: MUTED, textAlign: "center", fontFamily: "Helvetica" },
});

const lexStyles = {
  body: { fontSize: 7.5, color: TEXT, fontFamily: "Helvetica" },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  heading: { fontSize: 9 },
  bulletRow: { flexDirection: "row" as const, marginBottom: 3 },
  bulletDot: { fontSize: 7.5, marginRight: 4, width: 12, fontFamily: "Helvetica" },
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

function Signatures({ date, creatorName }: { date: string; creatorName?: string }) {
  return (
    <View>
      <View style={s.sigBlock}>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ATENTAMENTE</Text>
          <View style={s.sigLine} />
          <Text style={s.sigName}>{creatorName ?? "LCI. José Octavio Tirado Peña"}</Text>
          <Text style={{ fontSize: 8, color: MUTED, textAlign: "center" }}>Director General</Text>
        </View>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ACEPTAMOS COTIZACION</Text>
          <View style={s.sigLine} />
        </View>
      </View>
      <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 8, textAlign: "center" }}>{date}</Text>
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
  creatorName?: string;
}

export function QuotePdf({ data, logoUrl, termsJson, creatorName }: Props) {
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
          <Text style={s.companyValue}>{data.contact}</Text>
        </View>
        {data.phone ? (
          <View style={[s.companyRow, { marginBottom: 10 }]}>
            <Text style={s.companyLabel}>Teléfono:</Text>
            <Text style={s.companyValue}>{data.phone}</Text>
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
            <View key={i} style={[s.tableRow, { backgroundColor: rowBg(i) }]}>
              <Text style={s.tableCell}>{row.origin}</Text>
              <Text style={s.tableCell}>{row.destination}</Text>
              <Text style={s.tableCell}>{row.destinationState ?? ""}</Text>
              <Text style={s.tableCell}>${Number(row.cost).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={s.tableCellLast}>{row.unitLabel}</Text>
            </View>
          ))}
        </View>
        <Text style={s.termsTitle}>TERMINOS Y CONDICIONES</Text>
        {renderLexicalContent(termsJson.bulletsJson, lexStyles)}
        <Text style={s.validity}>{formatValidUntilEs(data.validUntil)}</Text>
        <Signatures date={dateStr} creatorName={creatorName} />
      </Page>

      {/* ── Página 2: Términos del contrato ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        <Text style={s.pageTitle}>TERMINOS INSERTOS EN EL CONTRATO</Text>
        {renderLexicalContent(termsJson.contractJson, lexStyles)}
        <Signatures date={dateStr} creatorName={creatorName} />
      </Page>

      {/* ── Página 3: Aviso de privacidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        <Text style={s.pageTitle}>AVISO DE PRIVACIDAD</Text>
        {renderLexicalContent(termsJson.privacyJson, lexStyles)}
        <Signatures date={dateStr} creatorName={creatorName} />
      </Page>

      {/* ── Página 4: Límites de responsabilidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <PageFooter />
        {renderLexicalContent(termsJson.limitsJson, lexStyles)}
        <Signatures date={dateStr} creatorName={creatorName} />
      </Page>
    </Document>
  );
}
