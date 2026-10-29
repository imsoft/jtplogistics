import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND as COLORS } from "@/lib/email-layout";
import { pdfSentence, pdfUpper } from "@/lib/pdf-text-case";

export interface InstructionLetterData {
  eco: string;
  client: string;
  product: string;
  pickupDate: string;
  deliveryDate: string;
  legalName: string;
  operatorName: string;
  phone: string;
  truck: string;
  trailer: string;
  unit: string;
  origin: string;
  destination: string;
  originAddress: string;
  destinationAddress: string;
  comments: string;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const day = (iso: string) => {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  return y && m && d ? `${d} de ${MONTHS[m - 1]} de ${y}` : "Por confirmar";
};
const v = (s: string) => (s?.trim() ? s.trim() : "—");

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: COLORS.text },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COLORS.blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  logo: { width: 120, height: 56, objectFit: "contain" },
  headRight: { alignItems: "flex-end" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase" },
  muted: { fontSize: 8.5, color: COLORS.muted, marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4 },
  cell: { width: "50%", padding: 7, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  label: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  stops: { flexDirection: "row", gap: 10 },
  stop: { flex: 1, backgroundColor: COLORS.background, borderRadius: 6, padding: 10 },
  stopTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase", marginBottom: 4 },
  city: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  addressLabel: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 2 },
  address: { fontSize: 11, fontFamily: "Helvetica-Bold", lineHeight: 1.35 },
  ecoBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.blue, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  ecoLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 1.5 },
  ecoValue: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  box: { borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4, padding: 9, minHeight: 50, lineHeight: 1.4 },
  list: { marginTop: 2, lineHeight: 1.45 },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  sign: { width: "42%", borderTopWidth: 0.8, borderTopColor: COLORS.text, paddingTop: 5, alignItems: "center" },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted },
});

/** Carta de instrucciones para el transportista: qué, dónde, cuándo y con qué unidad. */
export function InstructionLetterPdf({ data, logoUrl }: { data: InstructionLetterData; logoUrl: string }) {
  const today = new Date();
  const field = (label: string, value: string) => (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
  return (
    <Document title={`Carta de instrucciones ${data.eco || ""}`.trim()}>
      <Page size="LETTER" style={s.page}>
        <View style={s.bar} fixed />
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf no tiene alt */}
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headRight}>
            <Text style={s.title}>Carta de instrucciones</Text>
            <Text style={s.muted}>Emitida el {today.getDate()} de {MONTHS[today.getMonth()]} de {today.getFullYear()}</Text>
          </View>
        </View>

        <View style={s.ecoBox}>
          <Text style={s.ecoLabel}>Número ECO</Text>
          <Text style={s.ecoValue}>{pdfUpper(v(data.eco))}</Text>
        </View>

        <Text>
          {pdfUpper(v(data.legalName))}: por medio de la presente les confirmamos el servicio de flete con las siguientes instrucciones.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servicio</Text>
          <View style={s.grid}>
            {field("Cliente", pdfUpper(v(data.client)))}
            {field("Producto", pdfSentence(v(data.product)))}
            {field("Recolección", day(data.pickupDate))}
            {field("Entrega", day(data.deliveryDate))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ruta</Text>
          <View style={s.stops}>
            <View style={s.stop}>
              <Text style={s.stopTitle}>Origen · carga</Text>
              <Text style={s.city}>{pdfUpper(v(data.origin))}</Text>
              <Text style={s.addressLabel}>Dirección de carga</Text>
              <Text style={s.address}>{v(data.originAddress)}</Text>
            </View>
            <View style={s.stop}>
              <Text style={s.stopTitle}>Destino · entrega</Text>
              <Text style={s.city}>{pdfUpper(v(data.destination))}</Text>
              <Text style={s.addressLabel}>Dirección de entrega</Text>
              <Text style={s.address}>{v(data.destinationAddress)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Unidad y operador</Text>
          <View style={s.grid}>
            {field("Operador", pdfUpper(v(data.operatorName)))}
            {field("Celular", v(data.phone))}
            {field("Tipo de unidad", pdfSentence(v(data.unit)))}
            {field("Tracto / caja", `${v(data.truck)} / ${v(data.trailer)}`)}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Instrucciones y comentarios</Text>
          <View style={s.box}>
            <Text>{v(data.comments)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Indicaciones generales</Text>
          <View style={s.list}>
            <Text>• Presentarse en el origen en la fecha indicada con la documentación del operador y de la unidad vigente.</Text>
            <Text>• Reportar a JTP la carga, cualquier incidencia en el trayecto y la entrega en cuanto sucedan.</Text>
            <Text>• Entregar las evidencias (remisión o carta porte firmada y sellada) al concluir el servicio.</Text>
          </View>
        </View>

        <View style={s.signs} wrap={false}>
          <View style={s.sign}>
            <Text style={s.value}>JTP LOGISTICS</Text>
            <Text style={s.muted}>Nombre y firma de quien instruye</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.value}>{pdfUpper(v(data.legalName))}</Text>
            <Text style={s.muted}>Nombre y firma de recibido</Text>
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
