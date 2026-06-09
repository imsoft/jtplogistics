"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  EXPENSE_FIELDS,
  type MaritimeQuoteInput,
  type MaritimeQuoteComputed,
} from "@/lib/maritime-quote";

const BRAND = "#2D4EAA";
const TEXT = "#1A1A1A";
const LINE = "#C8D5EE";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 7.5, color: TEXT, paddingTop: 24, paddingBottom: 30, paddingHorizontal: 30 },
  header: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 2 },
  logo: { width: 150, height: 60, objectFit: "contain" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subtitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  label: { fontFamily: "Helvetica-Bold" },
  underlineValue: { borderBottomWidth: 0.8, borderBottomColor: TEXT, minWidth: 120, paddingBottom: 1 },
  para: { marginBottom: 4, fontSize: 7.5 },
  fractionBox: { borderWidth: 0.8, borderColor: TEXT, height: 13, marginBottom: 2, paddingHorizontal: 4, justifyContent: "center" },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginTop: 6, marginBottom: 4 },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  // bloque valor en aduana
  vaRow: { flexDirection: "row", marginBottom: 3 },
  vaLabel: { fontFamily: "Helvetica-Bold", width: 95 },
  vaCurrency: { fontFamily: "Helvetica-Bold", width: 26 },
  vaValue: { borderBottomWidth: 0.6, borderBottomColor: TEXT, flex: 1, textAlign: "right", paddingRight: 4 },
  // tabla ADV
  advHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BRAND, marginBottom: 1 },
  advHeadCell: { color: BRAND, fontFamily: "Helvetica-Bold", flex: 1, textAlign: "right", paddingVertical: 2 },
  advRow: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: LINE },
  advCellLabel: { fontFamily: "Helvetica-Bold", flex: 1, paddingVertical: 1.5 },
  advCell: { flex: 1, textAlign: "right", paddingVertical: 1.5 },
  advTotalRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BRAND, marginTop: 1 },
  advTotalLabel: { fontFamily: "Helvetica-Bold", flex: 1, paddingVertical: 2 },
  advTotalCell: { fontFamily: "Helvetica-Bold", flex: 1, textAlign: "right", paddingVertical: 2 },
  // gastos
  chargeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1, borderBottomWidth: 0.3, borderBottomColor: LINE },
  chargeLabel: { fontFamily: "Helvetica-Bold", flex: 1 },
  chargeValue: { textAlign: "right", width: 70 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 4, borderTopWidth: 1.2, borderTopColor: BRAND },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 10, letterSpacing: 1 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  restricTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 8 },
  restricText: { fontSize: 7.5, marginTop: 2, minHeight: 12 },
  vigencia: { fontSize: 7.5, marginTop: 6 },
  bankHead: { flexDirection: "row", backgroundColor: "#FBFBE5", borderWidth: 0.6, borderColor: TEXT, marginTop: 8 },
  bankHeadCell: { color: "#3a7d3a", fontFamily: "Helvetica-Bold", flex: 1, textAlign: "center", paddingVertical: 2, borderRightWidth: 0.6, borderRightColor: TEXT },
  bankRow: { flexDirection: "row", borderWidth: 0.6, borderTopWidth: 0, borderColor: TEXT },
  bankCell: { flex: 1, textAlign: "center", paddingVertical: 3, borderRightWidth: 0.6, borderRightColor: TEXT },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  sigLabel: { fontFamily: "Helvetica-Bold" },
});

function money(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function genDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatValidUntil(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d}-${months[m - 1]}-${y}`;
}

function ChargeRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.chargeRow}>
      <Text style={s.chargeLabel}>{label}</Text>
      <Text style={s.chargeValue}>$ {money(value)}</Text>
    </View>
  );
}

interface Props {
  input: MaritimeQuoteInput;
  computed: MaritimeQuoteComputed;
  logoUrl: string;
}

export function MaritimeQuotePdf({ input, computed, logoUrl }: Props) {
  const fractions = [0, 1, 2].map((i) => input.fractions?.[i] ?? "");

  const leftCharges: { label: string; value: number }[] = [
    ...computed.brackets.map((b) => ({ label: `IGI ${b.label}`, value: b.igi })),
    { label: "DTA", value: input.expenses.dta },
    { label: "IVA", value: computed.iva },
    { label: "Prevalidación", value: input.expenses.prevalidacion },
    { label: "Tránsito interno", value: input.expenses.transitoInterno },
    { label: "Maniobras", value: input.expenses.maniobras },
    { label: "Muellajes", value: input.expenses.muellajes },
    { label: "Almacenajes", value: input.expenses.almacenajes },
    { label: "Demoras", value: input.expenses.demoras },
  ];

  const rightCharges = EXPENSE_FIELDS.filter((f) => f.column === "right").map((f) => ({
    label: f.label,
    value: input.expenses[f.key],
  }));

  return (
    <Document title={`Cotizacion-Maritima-${input.reference}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={logoUrl} style={s.logo} />
        </View>

        <Text style={s.title}>SOLICITUD DE IMPUESTOS</Text>
        <Text style={s.subtitle}>{genDate()}</Text>

        <View style={s.rowBetween}>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.label}>CLIENTE: </Text>
            <Text>{input.client}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.label}>REFERENCIA: </Text>
            <Text style={s.underlineValue}>{input.reference}</Text>
          </View>
        </View>

        <Text style={[s.para, s.bold]}>ESTIMADOS CLIENTES Y AMIGOS :</Text>
        <Text style={s.para}>
          Hemos recibido documentacion para su despacho por este puerto, correspondiente a los siguientes documentos:
        </Text>
        <View style={s.rowBetween}>
          <View style={{ flexDirection: "row", flex: 1 }}>
            <Text style={s.label}>Factura(s) No.(s): </Text>
            <Text>{input.invoiceNumbers}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.label}>de Fecha: </Text>
            <Text style={s.underlineValue}>{input.invoiceDate}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <Text style={s.label}>Clientes: </Text>
          <Text>{input.clientName}</Text>
        </View>

        <Text style={s.para}>
          El calculo de los impuestos se determinó de acuerdo a la información proporcionada en los documentos enviados,
          basados en ello sugerimos las siguientes fracciones :
        </Text>
        {fractions.map((f, i) => (
          <View key={i} style={s.fractionBox}>
            <Text>{f}</Text>
          </View>
        ))}

        {/* ── Cálculo del valor en aduana ── */}
        <Text style={s.sectionTitle}>CALCULO DEL VALOR EN ADUANA DE LAS MERCANCIAS</Text>
        <View style={s.twoCol}>
          <View style={s.col}>
            <View style={s.vaRow}>
              <Text style={s.vaLabel}>Valor Factura.</Text>
              <Text style={s.vaCurrency}>USD</Text>
              <Text style={s.vaValue}>{money(input.invoiceValueUsd)}</Text>
            </View>
            <View style={s.vaRow}>
              <Text style={s.vaLabel}>Flete Internacional</Text>
              <Text style={s.vaCurrency}>USD</Text>
              <Text style={s.vaValue}>{money(input.internationalFreightUsd)}</Text>
            </View>
            <View style={s.vaRow}>
              <Text style={s.vaLabel}>Seguro</Text>
              <Text style={s.vaCurrency}>USD</Text>
              <Text style={s.vaValue}>{money(input.insuranceUsd)}</Text>
            </View>
            <View style={s.vaRow}>
              <Text style={s.vaLabel}>Otros</Text>
              <Text style={s.vaCurrency}>USD</Text>
              <Text style={s.vaValue}>{money(input.othersUsd)}</Text>
            </View>
            <View style={s.vaRow}>
              <Text style={s.vaLabel}>Total Incrementables</Text>
              <Text style={s.vaCurrency}>USD</Text>
              <Text style={s.vaValue}>{money(computed.totalIncrementables)}</Text>
            </View>
            <View style={[s.vaRow, { marginTop: 6 }]}>
              <Text style={s.vaLabel}>ETA:</Text>
              <Text style={s.vaValue}>{input.eta}</Text>
            </View>
          </View>

          <View style={s.col}>
            <View style={[s.vaRow, { marginBottom: 6 }]}>
              <Text style={s.vaLabel}>Tipo de Cambio</Text>
              <Text style={s.vaValue}>{money(input.exchangeRate)}</Text>
            </View>
            <View style={s.advHead}>
              <Text style={[s.advCellLabel, { color: BRAND }]}>ADV.</Text>
              <Text style={s.advHeadCell}>EUR</Text>
              <Text style={s.advHeadCell}>PESOS</Text>
            </View>
            {computed.brackets.map((b) => (
              <View key={b.key} style={s.advRow}>
                <Text style={s.advCellLabel}>{b.label}</Text>
                <Text style={s.advCell}>{b.valueForeign ? money(b.valueForeign) : "-"}</Text>
                <Text style={s.advCell}>{b.valuePesos ? money(b.valuePesos) : "-"}</Text>
              </View>
            ))}
            <View style={s.advTotalRow}>
              <Text style={s.advTotalLabel}>TOTAL</Text>
              <Text style={s.advTotalCell}>{money(computed.totalForeign)}</Text>
              <Text style={s.advTotalCell}>{money(computed.totalPesos)}</Text>
            </View>
          </View>
        </View>

        {/* ── Gastos e impuestos ── */}
        <Text style={s.sectionTitle}>EL CALCULO ESTIMADO DE SUS GASTOS E IMPUESTOS QUEDAN DE LA SIGUIENTE MANERA:</Text>
        <View style={s.twoCol}>
          <View style={s.col}>
            {leftCharges.map((c, i) => (
              <ChargeRow key={i} label={c.label} value={c.value} />
            ))}
          </View>
          <View style={s.col}>
            {rightCharges.map((c, i) => (
              <ChargeRow key={i} label={c.label} value={c.value} />
            ))}
          </View>
        </View>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL A DEPOSITAR:</Text>
          <Text style={s.totalValue}>$ {money(computed.totalADepositar)}</Text>
        </View>

        {/* ── Restricciones / vigencia ── */}
        <Text style={s.restricTitle}>RESTRICCIONES:</Text>
        <Text style={s.restricText}>{input.restricciones}</Text>
        <Text style={s.vigencia}>
          Cotizacion con vigencia hasta el:{"  "}
          <Text style={s.bold}>{formatValidUntil(input.validUntil)}</Text>
          {"  "}Si desea que su mercancia viaje con seguro favor de indicarlo, de lo contrario viajará por cuenta y
          riesgo del consignatario. La presente cotización queda sujeta a reconocimiento previo.
        </Text>

        {/* ── Datos bancarios ── */}
        <Text style={[s.vigencia, { marginTop: 8 }]}>
          Favor de realizar su depósito en la siguiente cuenta y enviar comprobante a
        </Text>
        <View style={s.bankHead}>
          <Text style={s.bankHeadCell}>BANCO</Text>
          <Text style={s.bankHeadCell}>CLABE INTERBANCARIA</Text>
          <Text style={[s.bankHeadCell, { borderRightWidth: 0 }]}>No. DE CUENTA</Text>
        </View>
        <View style={s.bankRow}>
          <Text style={s.bankCell}>{input.bankName}</Text>
          <Text style={s.bankCell}>{input.clabe}</Text>
          <Text style={[s.bankCell, { borderRightWidth: 0 }]}>{input.accountNumber}</Text>
        </View>

        <View style={s.sigRow}>
          <Text style={s.sigLabel}>Elaboró {input.elaboro ? `  ${input.elaboro}` : ""}</Text>
          <Text style={s.sigLabel}>Aprobó. {input.aprobo ? `  ${input.aprobo}` : ""}</Text>
        </View>
      </Page>
    </Document>
  );
}
