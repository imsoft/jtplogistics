"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { renderLexicalContent } from "@/lib/utils/lexical-to-pdf";
import type { ProviderTariffData } from "@/types/provider-tariff.types";

// Colores del machote autorizado: azul marino para las cabeceras y azul claro
// para las filas de tarifas.
const NAVY = "#1F3864";
const ROW_BLUE = "#B4C7E7";
const WHITE = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#6B7280";
const LINE = "#C8D5EE";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 18, paddingBottom: 36, paddingHorizontal: 32 },
  // ── Encabezado: logo a la izquierda, fecha y vigencia a la derecha ──
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  // El PNG es cuadrado (3200x3200) con aire alrededor del logo: si la caja es
  // apaisada, `contain` lo encoge a la altura y deja los lados vacíos. Cuadrada,
  // el logo aprovecha todo el espacio.
  logo: { width: 132, height: 132, objectFit: "contain" },
  headerRight: { maxWidth: 230, paddingTop: 30 },
  headerLine: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "left" },
  // ── Banda del título ──
  banner: { backgroundColor: NAVY, paddingVertical: 5, marginBottom: 10 },
  bannerText: { color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" },
  // ── Datos del proveedor ──
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { fontSize: 10, width: 78 },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  // ── Banda del acuerdo ──
  agreement: { backgroundColor: NAVY, paddingVertical: 5, marginTop: 8, marginBottom: 8 },
  agreementText: { color: WHITE, fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 3 },
  // ── Tabla ──
  tableHead: { flexDirection: "row", backgroundColor: NAVY },
  th: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 6, textAlign: "center", borderRightWidth: 1, borderRightColor: WHITE },
  row: { flexDirection: "row", backgroundColor: ROW_BLUE, borderTopWidth: 1, borderTopColor: WHITE },
  td: { fontSize: 8.5, paddingVertical: 7, paddingHorizontal: 6, textAlign: "center", borderRightWidth: 1, borderRightColor: WHITE },
  // Anchos de columna, calcados del machote.
  colOrigin: { flex: 1.1 },
  colDestination: { flex: 1.1 },
  colCost: { flex: 1.1 },
  colUnit: { flex: 1.1 },
  colTerms: { flex: 1.5 },
  // ── Cláusulas ──
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, textAlign: "center", textDecoration: "underline", marginTop: 14, marginBottom: 8 },
  // ── Firmas ──
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  sigColumn: { width: "42%" },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, marginBottom: 5 },
  sigName: { fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "center" },
  sigRole: { fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "center" },
  // ── Pie ──
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5 },
  footerText: { fontSize: 8, color: MUTED, textAlign: "center" },
});

const lexStyles = {
  body: { fontSize: 7, color: TEXT, fontFamily: "Helvetica" },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  heading: { fontSize: 8.5 },
  bulletRow: { flexDirection: "row" as const, marginBottom: 3 },
  bulletDot: { fontSize: 7, marginRight: 4, width: 10, fontFamily: "Helvetica" },
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "MARTES 28 DE JULIO DE 2026, GUADALAJARA, JALISCO" */
function formatIssueDate(date: Date): string {
  return `${DAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}, Guadalajara, Jalisco`.toUpperCase();
}

/** "VIGENCIA: 31 DE DICIEMBRE DE 2026" a partir de "YYYY-MM-DD". */
function formatValidUntil(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `Vigencia: ${d} de ${MONTHS[m - 1]} de ${y}`.toUpperCase();
}

/** El machote va todo en mayúsculas, igual que el resto de la interfaz. */
function upper(value: string | null | undefined): string {
  return (value ?? "").toUpperCase();
}

/** "$10,500+IVA-RET", como en el machote. */
function formatCost(cost: number): string {
  const amount = cost.toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `$${amount}+IVA-RET`;
}

interface Props {
  data: ProviderTariffData;
  logoUrl: string;
  /** Cláusulas en formato Lexical; vienen de los textos legales editables. */
  termsJson: string;
  /** Quien emite el tarifario por parte de JTP (aparece en la firma). */
  issuerName?: string;
  issuerPosition?: string;
}

export function ProviderTariffPdf({ data, logoUrl, termsJson, issuerName, issuerPosition }: Props) {
  const today = new Date();

  return (
    <Document title={`Tarifario-${data.legalName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>jtp.com.mx</Text>
        </View>

        <View style={s.header}>
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.headerLine}>{formatIssueDate(today)}</Text>
            <Text style={s.headerLine}>{formatValidUntil(data.validUntil)}</Text>
          </View>
        </View>

        <View style={s.banner}>
          <Text style={s.bannerText}>Propuesta de servicio Nacional</Text>
        </View>

        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Razón social:</Text>
          <Text style={s.infoValue}>{upper(data.legalName)}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Contacto:</Text>
          <Text style={s.infoValue}>{upper(data.contact)}</Text>
        </View>
        {data.phone ? (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Teléfono:</Text>
            <Text style={s.infoValue}>{data.phone}</Text>
          </View>
        ) : null}
        {data.email ? (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Correo:</Text>
            {/* El correo se deja en minúsculas: en mayúsculas se lee peor y no
                es como se escribe una dirección. */}
            <Text style={s.infoValue}>{data.email.toLowerCase()}</Text>
          </View>
        ) : null}

        <View style={s.agreement}>
          <Text style={s.agreementText}>Acuerdo comercial tarifas ruta nacionales</Text>
        </View>

        <View>
          <View style={s.tableHead}>
            <Text style={[s.th, s.colOrigin]}>ORIGEN</Text>
            <Text style={[s.th, s.colDestination]}>DESTINO</Text>
            <Text style={[s.th, s.colCost]}>COSTO</Text>
            <Text style={[s.th, s.colUnit]}>UNIDAD</Text>
            <Text style={[s.th, s.colTerms]}>TERMINO Y CONDICION</Text>
          </View>
          {data.rows.map((row, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.td, s.colOrigin]}>{upper(row.origin)}</Text>
              <Text style={[s.td, s.colDestination]}>{upper(row.destination)}</Text>
              <Text style={[s.td, s.colCost]}>{formatCost(row.cost)}</Text>
              <Text style={[s.td, s.colUnit]}>{upper(row.unitLabel)}</Text>
              <Text style={[s.td, s.colTerms]}>{upper(row.terms)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.termsTitle}>TERMINOS Y CONDICIONES</Text>
        {renderLexicalContent(termsJson, lexStyles)}

        {/* Sin wrap={false} las líneas se quedan en una página y los nombres
            saltan a la siguiente, dejando el documento sin firmar. */}
        <View style={s.sigBlock} wrap={false}>
          <View style={s.sigColumn}>
            <View style={s.sigLine} />
            {issuerName ? <Text style={s.sigName}>{upper(issuerName)}</Text> : null}
            {issuerPosition ? <Text style={s.sigRole}>{upper(issuerPosition)}</Text> : null}
          </View>
          <View style={s.sigColumn}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{upper(data.contact)}</Text>
            <Text style={s.sigRole}>{upper(data.legalName)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
