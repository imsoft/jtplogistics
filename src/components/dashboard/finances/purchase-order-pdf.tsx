import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND as COLORS } from "@/lib/email-layout";
import { pdfSentence, pdfUpper } from "@/lib/pdf-text-case";
import { formatMxn } from "@/lib/utils";

export interface PurchaseOrderData {
  eco: string;
  legalName: string;
  client: string;
  product: string;
  unit: string;
  pickupDate: string;
  deliveryDate: string;
  origin: string;
  destination: string;
  originAddress: string;
  destinationAddress: string;
  operatorName: string;
  truck: string;
  trailer: string;
  /** Tarifa de compra base, sin costos extra. */
  baseCost: number;
  extras: { concept: string; amount: number }[];
}

const IVA = 0.16;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const day = (iso: string) => {
  const [y, m, d] = (iso ?? "").slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} de ${MONTHS[m - 1]} de ${y}` : "Por confirmar";
};
const v = (s: string) => (s?.trim() ? s.trim() : "—");
const money = (n: number) => `$${formatMxn(n)}`;

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: COLORS.text },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COLORS.blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  logo: { width: 120, height: 56, objectFit: "contain" },
  headRight: { alignItems: "flex-end" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase" },
  folio: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },
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
  city: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  table: { borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4 },
  th: { flexDirection: "row", backgroundColor: COLORS.background, paddingVertical: 6, paddingHorizontal: 8 },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  concept: { flex: 1 },
  amount: { width: 110, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 230, marginTop: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 3, paddingTop: 5, borderTopWidth: 0.8, borderTopColor: COLORS.text },
  grandText: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  list: { marginTop: 2, lineHeight: 1.45 },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  sign: { width: "42%", borderTopWidth: 0.8, borderTopColor: COLORS.text, paddingTop: 5, alignItems: "center" },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted },
});

/** Orden de compra al transportista: el servicio contratado y lo que JTP le pagará. */
export function PurchaseOrderPdf({ data, logoUrl }: { data: PurchaseOrderData; logoUrl: string }) {
  const today = new Date();
  const subtotal = data.baseCost + data.extras.reduce((sum, x) => sum + x.amount, 0);
  const iva = Math.round(subtotal * IVA * 100) / 100;
  const folio = data.eco ? `OC ${pdfUpper(data.eco)}` : "Orden de compra";
  const field = (label: string, value: string) => (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
  return (
    <Document title={`Orden de compra ${data.eco || ""}`.trim()}>
      <Page size="LETTER" style={s.page}>
        <View style={s.bar} fixed />
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf no tiene alt */}
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headRight}>
            <Text style={s.title}>Orden de compra</Text>
            <Text style={s.folio}>{folio}</Text>
            <Text style={s.muted}>Emitida el {today.getDate()} de {MONTHS[today.getMonth()]} de {today.getFullYear()}</Text>
          </View>
        </View>

        <Text>
          {pdfUpper(v(data.legalName))}: por medio de la presente JTP Logistics les solicita el siguiente servicio de flete en los términos descritos.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servicio</Text>
          <View style={s.grid}>
            {field("Proveedor", pdfUpper(v(data.legalName)))}
            {field("Número ECO", pdfUpper(v(data.eco)))}
            {field("Recolección", day(data.pickupDate))}
            {field("Entrega", day(data.deliveryDate))}
            {field("Producto", pdfSentence(v(data.product)))}
            {field("Tipo de unidad", pdfSentence(v(data.unit)))}
            {field("Operador", pdfUpper(v(data.operatorName)))}
            {field("Tracto / caja", `${v(data.truck)} / ${v(data.trailer)}`)}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ruta</Text>
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

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Importe</Text>
          <View style={s.table}>
            <View style={s.th}>
              <Text style={[s.thText, s.concept]}>Concepto</Text>
              <Text style={[s.thText, s.amount]}>Importe</Text>
            </View>
            <View style={s.tr}>
              <Text style={s.concept}>Flete {pdfUpper(v(data.origin))} – {pdfUpper(v(data.destination))}</Text>
              <Text style={s.amount}>{money(data.baseCost)}</Text>
            </View>
            {data.extras.map((x, i) => (
              <View key={i} style={s.tr}>
                <Text style={s.concept}>{pdfSentence(x.concept)}</Text>
                <Text style={s.amount}>{money(x.amount)}</Text>
              </View>
            ))}
          </View>
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text>Subtotal</Text>
              <Text>{money(subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text>IVA 16%</Text>
              <Text>{money(iva)}</Text>
            </View>
            <View style={s.grand}>
              <Text style={s.grandText}>Total</Text>
              <Text style={s.grandText}>{money(subtotal + iva)} MXN</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Condiciones</Text>
          <View style={s.list}>
            <Text>• La factura debe emitirse a nombre de JTP Logistics por el importe de esta orden e indicar el número ECO.</Text>
            <Text>• El pago se libera al recibir la factura y las evidencias de entrega (remisión o carta porte firmada y sellada).</Text>
            <Text>• Cualquier cargo adicional debe autorizarse por escrito antes de prestarse el servicio.</Text>
          </View>
        </View>

        <View style={s.signs} wrap={false}>
          <View style={s.sign}>
            <Text style={s.value}>JTP LOGISTICS</Text>
            <Text style={s.muted}>Nombre y firma de quien autoriza</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.value}>{pdfUpper(v(data.legalName))}</Text>
            <Text style={s.muted}>Nombre y firma de aceptación</Text>
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
