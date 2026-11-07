import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND as COLORS } from "@/lib/email-layout";
import { pdfSentence, pdfUpper } from "@/lib/pdf-text-case";

export interface CartaPorteData {
  eco: string;
  client: string;
  pickupDate: string;
  deliveryDate: string;
  origin: string;
  destination: string;
  originAddress: string;
  destinationAddress: string;
  product: string;
  /** Nombre del tipo de unidad (no la clave). */
  unit: string;
  legalName: string;
  operatorName: string;
  phone: string;
  truck: string;
  trailer: string;
  comments: string;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const day = (iso: string) => {
  const [y, m, d] = (iso ?? "").slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} de ${MONTHS[m - 1]} de ${y}` : "Por confirmar";
};
const v = (s: string) => (s?.trim() ? s.trim() : "—");

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: COLORS.text, textTransform: "uppercase" },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COLORS.blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  logo: { width: 120, height: 56, objectFit: "contain" },
  headRight: { alignItems: "flex-end", maxWidth: 300 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase" },
  folio: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },
  muted: { fontSize: 8.5, color: COLORS.muted, marginTop: 2 },
  notice: { fontSize: 7.5, color: COLORS.muted, marginTop: 3, textAlign: "right" },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4 },
  cell: { width: "50%", padding: 7, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  label: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  stops: { flexDirection: "row", gap: 10 },
  stop: { flex: 1, backgroundColor: COLORS.background, borderRadius: 6, padding: 10 },
  stopTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase", marginBottom: 4 },
  city: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  box: { borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4, padding: 8, minHeight: 40, lineHeight: 1.4 },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 44 },
  sign: { width: "42%", borderTopWidth: 0.8, borderTopColor: COLORS.text, paddingTop: 5, alignItems: "center" },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted },
});

/** Carta porte imprimible del embarque: documento de traslado, no es el CFDI. */
export function CartaPortePdf({ data, logoUrl }: { data: CartaPorteData; logoUrl: string }) {
  const today = new Date();
  const folio = data.eco ? `ECO ${pdfUpper(data.eco)}` : "Sin ECO";
  const field = (label: string, value: string) => (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
  return (
    <Document title={`Carta porte ${data.eco || ""}`.trim()}>
      <Page size="LETTER" style={s.page}>
        <View style={s.bar} fixed />
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf no tiene alt */}
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headRight}>
            <Text style={s.title}>Carta porte</Text>
            <Text style={s.folio}>{folio}</Text>
            <Text style={s.muted}>Emitida el {today.getDate()} de {MONTHS[today.getMonth()]} de {today.getFullYear()}</Text>
            <Text style={s.notice}>Documento de traslado. No sustituye al CFDI con complemento Carta Porte.</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servicio</Text>
          <View style={s.grid}>
            {field("Número ECO", pdfUpper(v(data.eco)))}
            {field("Cliente", pdfUpper(v(data.client)))}
            {field("Fecha de recolección", day(data.pickupDate))}
            {field("Fecha de entrega", day(data.deliveryDate))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Origen y destino</Text>
          <View style={s.stops}>
            <View style={s.stop}>
              <Text style={s.stopTitle}>Origen · carga</Text>
              <Text style={s.city}>{pdfUpper(v(data.origin))}</Text>
              <Text>{v(data.originAddress)}</Text>
            </View>
            <View style={s.stop}>
              <Text style={s.stopTitle}>Destino · entrega</Text>
              <Text style={s.city}>{pdfUpper(v(data.destination))}</Text>
              <Text>{v(data.destinationAddress)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Mercancía</Text>
          <View style={s.grid}>
            {field("Producto", pdfSentence(v(data.product)))}
            {field("Tipo de unidad", pdfSentence(v(data.unit)))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Transporte</Text>
          <View style={s.grid}>
            {field("Transportista", pdfUpper(v(data.legalName)))}
            {field("Operador", pdfUpper(v(data.operatorName)))}
            {field("Celular", v(data.phone))}
            {field("Tracto", v(data.truck))}
            {field("Caja", v(data.trailer))}
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Observaciones</Text>
          <View style={s.box}>
            <Text>{v(data.comments)}</Text>
          </View>
        </View>

        <View style={s.signs} wrap={false}>
          <View style={s.sign}>
            <Text style={s.value}>JTP LOGISTICS</Text>
            <Text style={s.muted}>Nombre y firma</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.value}>{pdfUpper(v(data.legalName))}</Text>
            <Text style={s.muted}>Transportista · nombre y firma</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>JTP Logistics · El mejor socio comercial</Text>
          <Text>jtp.com.mx</Text>
        </View>
      </Page>
    </Document>
  );
}
