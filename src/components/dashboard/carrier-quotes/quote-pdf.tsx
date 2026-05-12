"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { QuoteData } from "@/types/carrier-quote.types";
import { TERMS_BULLETS, TERMS_CONTRACT, TERMS_PRIVACY, TERMS_LIMITS } from "@/lib/constants/quote-terms";

const NAVY = "#00264D";
const LIGHT_BLUE = "#D6E8F7";
const WHITE = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#555555";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 28, paddingBottom: 50, paddingHorizontal: 36 },
  row: { flexDirection: "row", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { width: 90, height: 36, objectFit: "contain" },
  headerDate: { fontSize: 8, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right", maxWidth: 200 },
  // Dark section header
  sectionHeader: { backgroundColor: NAVY, color: WHITE, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 0 },
  sectionHeaderText: { color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  // Title banner
  titleBanner: { backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 10 },
  titleText: { color: WHITE, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  // Company info
  companyRow: { flexDirection: "row", marginBottom: 4 },
  companyLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, width: 60 },
  companyValue: { fontSize: 9 },
  // Table
  table: { marginBottom: 10, borderWidth: 0.5, borderColor: NAVY },
  tableHead: { flexDirection: "row", backgroundColor: NAVY },
  tableHeadCell: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8, padding: 5, flex: 1, borderRightWidth: 0.5, borderRightColor: "#4488BB" },
  tableHeadCellLast: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8, padding: 5, flex: 1.5 },
  tableRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: NAVY },
  tableCell: { fontSize: 8, padding: 5, flex: 1, borderRightWidth: 0.5, borderRightColor: "#AACCEE" },
  tableCellLast: { fontSize: 8, padding: 5, flex: 1.5 },
  // Terms
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", textDecoration: "underline", marginBottom: 8, marginTop: 10 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { fontSize: 8, marginRight: 4, width: 10 },
  bulletText: { fontSize: 7.5, flex: 1, lineHeight: 1.4 },
  bulletTextBold: { fontSize: 7.5, flex: 1, fontFamily: "Helvetica-Bold", lineHeight: 1.4 },
  validity: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", textDecoration: "underline", marginTop: 10, marginBottom: 10 },
  // Signatures
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 8 },
  sigColumn: { width: "45%" },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 20 },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, marginBottom: 4 },
  sigName: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  sigPosition: { fontSize: 8, color: MUTED },
  // Contract/Privacy page
  pageTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 12, letterSpacing: 1 },
  subTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4, marginTop: 8 },
  bodyText: { fontSize: 7.5, lineHeight: 1.5, marginBottom: 6 },
});

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

interface PageHeaderProps { logoUrl: string; date: string; }
function PageHeader({ logoUrl, date }: PageHeaderProps) {
  return (
    <View style={s.header} fixed>
      <Image src={logoUrl} style={s.logo} />
      <Text style={s.headerDate}>{date}</Text>
    </View>
  );
}

interface SignaturesProps { date: string; }
function Signatures({ date }: SignaturesProps) {
  return (
    <View>
      <View style={s.sigBlock}>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ATENTAMENTE</Text>
          <View style={s.sigLine} />
          <Text style={s.sigName}>LCI. José Octavio Tirado Peña</Text>
          <Text style={s.sigPosition}>Director General</Text>
        </View>
        <View style={s.sigColumn}>
          <Text style={s.sigLabel}>ACEPTAMOS COTIZACION</Text>
          <View style={s.sigLine} />
        </View>
      </View>
      <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 8 }}>{date}</Text>
    </View>
  );
}

interface Props { data: QuoteData; logoUrl: string; }

export function QuotePdf({ data, logoUrl }: Props) {
  const today = new Date();
  const dateStr = formatDateEs(today);
  const rowBg = (i: number) => (i % 2 === 0 ? LIGHT_BLUE : WHITE);

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

        {/* Routes table */}
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

        {/* Terms */}
        <Text style={s.termsTitle}>TERMINOS Y CONDICIONES</Text>
        {TERMS_BULLETS.map((b, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={b.bold ? s.bulletTextBold : s.bulletText}>{b.text}</Text>
          </View>
        ))}

        <Text style={s.validity}>{formatValidUntilEs(data.validUntil)}</Text>
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 2: Términos del contrato ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        <Text style={s.pageTitle}>TERMINOS INSERTOS EN EL CONTRATO</Text>
        {TERMS_CONTRACT.split("\n\n").map((paragraph, i) => {
          const isHeader = paragraph === paragraph.toUpperCase() && paragraph.length < 60;
          return (
            <Text key={i} style={isHeader ? s.subTitle : s.bodyText}>{paragraph}</Text>
          );
        })}
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 3: Aviso de privacidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        {TERMS_PRIVACY.split("\n\n").map((paragraph, i) => {
          const isHeader = i === 0;
          return (
            <Text key={i} style={isHeader ? s.pageTitle : s.bodyText}>{paragraph}</Text>
          );
        })}
        <Signatures date={dateStr} />
      </Page>

      {/* ── Página 4: Límites de responsabilidad ── */}
      <Page size="A4" style={s.page}>
        <PageHeader logoUrl={logoUrl} date={dateStr} />
        {TERMS_LIMITS.split("\n\n").map((paragraph, i) => {
          const isHeader = i === 0 && paragraph.startsWith("Límites");
          return (
            <Text key={i} style={isHeader ? s.subTitle : s.bodyText}>{paragraph}</Text>
          );
        })}
        <Signatures date={dateStr} />
      </Page>
    </Document>
  );
}
