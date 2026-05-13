"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { QuoteData } from "@/types/carrier-quote.types";
import { renderLexicalContent } from "@/lib/utils/lexical-to-pdf";

const NAVY = "#00264D";
const NAVY_LIGHT = "#E8F0F8";
const WHITE = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#555555";
const ROW_LINE = "#D0DCE8";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 28, paddingBottom: 50, paddingHorizontal: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { width: 160, height: 64, objectFit: "contain" },
  headerDate: { fontSize: 8, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right", maxWidth: 200 },
  titleBanner: { backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 10 },
  titleText: { color: WHITE, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  companyRow: { flexDirection: "row", marginBottom: 4 },
  companyLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, width: 60 },
  companyValue: { fontSize: 9 },
  sectionHeader: { backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 0 },
  sectionHeaderText: { color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  table: { marginBottom: 14 },
  tableAccent: { height: 3, backgroundColor: NAVY, marginBottom: 0 },
  tableHead: { flexDirection: "row", backgroundColor: NAVY },
  tableHeadCell: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 8, paddingHorizontal: 10, flex: 1, letterSpacing: 0.4 },
  tableHeadCellLast: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 8, paddingHorizontal: 10, flex: 1.5, letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: ROW_LINE },
  tableCell: { fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 10, flex: 1, color: TEXT },
  tableCellLast: { fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 10, flex: 1.5, color: TEXT },
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", textDecoration: "underline", marginBottom: 8, marginTop: 10 },
  validity: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", textDecoration: "underline", marginTop: 10, marginBottom: 10 },
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 8 },
  sigColumn: { width: "45%" },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 20, textAlign: "center" },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, marginBottom: 4 },
  sigName: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  pageTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 12, letterSpacing: 1 },
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

function Signatures({ date }: { date: string }) {
  return (
    <View>
      <View style={s.sigBlock}>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ATENTAMENTE</Text>
          <View style={s.sigLine} />
          <Text style={s.sigName}>LCI. José Octavio Tirado Peña</Text>
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
}

export function QuotePdf({ data, logoUrl, termsJson }: Props) {
  const today = new Date();
  const dateStr = formatDateEs(today);
  const rowBg = (i: number) => (i % 2 === 0 ? NAVY_LIGHT : WHITE);

  return (
    <Document title={`Cotizacion-${data.quoteNumber}`}>
      {/* ── Página 1: Cotización ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <View style={s.titleBanner}>
          <Text style={s.titleText}>Propuesta de servicio Nacional/Internacional</Text>
        </View>
        <View style={[s.companyRow, { marginBottom: 2 }]}>
          <Text style={s.companyLabel}>Compañía:</Text>
          <Text style={s.companyValue}>{data.company}</Text>
        </View>
        <View style={[s.companyRow, { marginBottom: 10 }]}>
          <Text style={s.companyLabel}>Contacto:</Text>
          <Text style={s.companyValue}>{data.contact}</Text>
        </View>
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>N O . &nbsp; C O T I Z A C I O N &nbsp; {data.quoteNumber}</Text>
        </View>
        <View style={s.table}>
          <View style={s.tableAccent} />
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
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 2: Términos del contrato ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <Text style={s.pageTitle}>TERMINOS INSERTOS EN EL CONTRATO</Text>
        {renderLexicalContent(termsJson.contractJson, lexStyles)}
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 3: Aviso de privacidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <Text style={s.pageTitle}>AVISO DE PRIVACIDAD</Text>
        {renderLexicalContent(termsJson.privacyJson, lexStyles)}
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 4: Límites de responsabilidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        {renderLexicalContent(termsJson.limitsJson, lexStyles)}
        <Signatures date={dateStr} />
      </Page>
    </Document>
  );
}
