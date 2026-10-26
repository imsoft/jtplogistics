"use client";

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatMxn } from "@/lib/utils";
import type { Currency } from "@/lib/billing";
import type { CashFlowReport, StatementReport } from "@/lib/billing-reports-server";

// Los colores de la plataforma, en hexadecimal.
const BRAND = "#1447E6";
const ROW = "#EAF1FF";
const WHITE = "#FFFFFF";
const TEXT = "#09090B";
const MUTED = "#57637D";
const LINE = "#D7DFEE";
const RED = "#C81E1E";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  logo: { width: 84, height: 84, objectFit: "contain" },
  headerRight: { alignItems: "flex-end", maxWidth: 300 },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 },
  headerLine: { fontSize: 8.5, color: MUTED, textAlign: "right", marginTop: 3 },
  banner: { backgroundColor: BRAND, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 10 },
  bannerText: { color: WHITE, fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1 },
  section: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND, marginTop: 6, marginBottom: 6 },
  summary: { flexDirection: "row", gap: 8, marginBottom: 10 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 8 },
  cardLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND, marginTop: 2 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  th: { flexDirection: "row", backgroundColor: ROW, paddingVertical: 4, paddingHorizontal: 6 },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: LINE },
  trStrong: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: LINE, backgroundColor: ROW },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  empty: { borderWidth: 1, borderColor: LINE, borderStyle: "dashed", borderRadius: 6, padding: 16, textAlign: "center", color: MUTED, fontSize: 9 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: MUTED },
});

const money = (n: number, c: Currency) => `${n < 0 ? "-" : ""}$${formatMxn(Math.abs(n))} ${c}`;

function longDate(key: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

function shortDate(key: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

function Frame({ title, lines, banner, logoUrl, generatedBy, children }: {
  title: string;
  lines: string[];
  banner: string;
  logoUrl: string;
  generatedBy: string;
  children: React.ReactNode;
}) {
  const generated = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  return (
    <Page size="A4" style={s.page}>
      <View style={s.footer} fixed>
        <Text style={s.footerText}>JTP Logistics · Administración</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
      <View style={s.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no lleva alt */}
        <Image src={logoUrl} style={s.logo} />
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>{title}</Text>
          {lines.map((l) => (
            <Text key={l} style={s.headerLine}>{l}</Text>
          ))}
        </View>
      </View>
      <View style={s.banner}>
        <Text style={s.bannerText}>{banner}</Text>
      </View>
      {children}
      <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 10 }}>Generado por {generatedBy} el {generated}.</Text>
    </Page>
  );
}

type PdfStyle = NonNullable<React.ComponentProps<typeof View>["style"]>;

function Cell({ w, children, style }: { w: number | string; children: React.ReactNode; style?: PdfStyle }) {
  return <Text style={[{ width: w }, ...(Array.isArray(style) ? style : style ? [style] : [])] as PdfStyle}>{children}</Text>;
}

export function StatementPdf({ report, logoUrl, generatedBy }: { report: StatementReport; logoUrl: string; generatedBy: string }) {
  const isReceivable = report.kind === "receivable";
  return (
    <Document title={`Estado de cuenta ${report.party.name}`}>
      <Frame
        title="Estado de cuenta"
        lines={[report.party.name, ...(report.party.rfc ? [`RFC ${report.party.rfc}`] : []), `Del ${longDate(report.from)} al ${longDate(report.to)}`]}
        banner={isReceivable ? "Cliente · cuentas por cobrar" : "Proveedor · cuentas por pagar"}
        logoUrl={logoUrl}
        generatedBy={generatedBy}
      >
        {report.currencies.length === 0 && <Text style={s.empty}>No hay facturas en el periodo ni saldo anterior.</Text>}
        {report.currencies.map((c) => (
          <View key={c.currency}>
            {report.currencies.length > 1 && <Text style={s.section}>En {c.currency === "MXN" ? "pesos" : "dólares"}</Text>}
            <View style={s.summary}>
              {[
                ["Saldo inicial", c.opening],
                ["Facturado", c.charges],
                [isReceivable ? "Cobrado" : "Pagado", c.credits],
                ["Saldo final", c.closing],
              ].map(([label, value]) => (
                <View key={label as string} style={s.card}>
                  <Text style={s.cardLabel}>{label}</Text>
                  <Text style={s.cardValue}>{money(value as number, c.currency)}</Text>
                </View>
              ))}
            </View>

            <View style={s.table}>
              <View style={s.th} fixed>
                <Cell w="12%" style={s.thText}>Fecha</Cell>
                <Cell w="13%" style={s.thText}>Folio</Cell>
                <Cell w="33%" style={s.thText}>Concepto</Cell>
                <Cell w="14%" style={[s.thText, s.right]}>Cargo</Cell>
                <Cell w="14%" style={[s.thText, s.right]}>Abono</Cell>
                <Cell w="14%" style={[s.thText, s.right]}>Saldo</Cell>
              </View>
              <View style={s.trStrong}>
                <Cell w="58%" style={s.bold}>Saldo inicial al {shortDate(report.from)}</Cell>
                <Cell w="28%"> </Cell>
                <Cell w="14%" style={[s.bold, s.right]}>{money(c.opening, c.currency)}</Cell>
              </View>
              {c.lines.map((l, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <Cell w="12%">{shortDate(l.date)}</Cell>
                  <Cell w="13%">{l.folio}</Cell>
                  <Cell w="33%">{l.concept}</Cell>
                  <Cell w="14%" style={s.right}>{l.charge ? money(l.charge, c.currency) : ""}</Cell>
                  <Cell w="14%" style={s.right}>{l.credit ? money(l.credit, c.currency) : ""}</Cell>
                  <Cell w="14%" style={s.right}>{money(l.balance, c.currency)}</Cell>
                </View>
              ))}
              <View style={s.trStrong}>
                <Cell w="58%" style={s.bold}>Saldo final al {shortDate(report.to)}</Cell>
                <Cell w="14%" style={[s.bold, s.right]}>{money(c.charges, c.currency)}</Cell>
                <Cell w="14%" style={[s.bold, s.right]}>{money(c.credits, c.currency)}</Cell>
                <Cell w="14%" style={[s.bold, s.right]}>{money(c.closing, c.currency)}</Cell>
              </View>
            </View>

            {c.open.length > 0 && (
              <>
                <Text style={s.section}>Facturas pendientes al {shortDate(report.to)}</Text>
                <View style={s.table}>
                  <View style={s.th}>
                    <Cell w="18%" style={s.thText}>Folio</Cell>
                    <Cell w="16%" style={s.thText}>Fecha</Cell>
                    <Cell w="16%" style={s.thText}>Vence</Cell>
                    <Cell w="18%" style={[s.thText, s.right]}>Total</Cell>
                    <Cell w="18%" style={[s.thText, s.right]}>Saldo</Cell>
                    <Cell w="14%" style={[s.thText, s.right]}>Atraso</Cell>
                  </View>
                  {c.open.map((o) => (
                    <View key={o.folio + o.issueDate} style={s.tr} wrap={false}>
                      <Cell w="18%">{o.folio}</Cell>
                      <Cell w="16%">{shortDate(o.issueDate)}</Cell>
                      <Cell w="16%">{shortDate(o.dueDate)}</Cell>
                      <Cell w="18%" style={s.right}>{money(o.total, c.currency)}</Cell>
                      <Cell w="18%" style={s.right}>{money(o.balance, c.currency)}</Cell>
                      <Cell w="14%" style={o.daysOverdue ? [s.right, { color: RED }] : s.right}>
                        {o.daysOverdue ? `${o.daysOverdue} días` : "Al corriente"}
                      </Cell>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}
      </Frame>
    </Document>
  );
}

export function CashFlowPdf({ report, title, logoUrl, generatedBy }: { report: CashFlowReport; title: string; logoUrl: string; generatedBy: string }) {
  return (
    <Document title={`Flujo de efectivo ${title}`}>
      <Frame
        title="Flujo de efectivo"
        lines={[title, `Del ${longDate(report.from)} al ${longDate(report.to)}`]}
        banner="Entradas y salidas de las cuentas de la empresa"
        logoUrl={logoUrl}
        generatedBy={generatedBy}
      >
        {report.currencies.length === 0 && <Text style={s.empty}>Todavía no hay cuentas de banco dadas de alta.</Text>}
        {report.currencies.map((c) => (
          <View key={c.currency}>
            {report.currencies.length > 1 && <Text style={s.section}>En {c.currency === "MXN" ? "pesos" : "dólares"}</Text>}
            <View style={s.summary}>
              {[
                ["Saldo inicial", c.opening],
                ["Entradas", c.inflows],
                ["Salidas", -c.outflows],
                ["Saldo final", c.closing],
              ].map(([label, value]) => (
                <View key={label as string} style={s.card}>
                  <Text style={s.cardLabel}>{label}</Text>
                  <Text style={s.cardValue}>{money(value as number, c.currency)}</Text>
                </View>
              ))}
            </View>

            <View style={s.table}>
              <View style={s.th}>
                <Cell w="70%" style={s.thText}>Concepto</Cell>
                <Cell w="30%" style={[s.thText, s.right]}>Importe</Cell>
              </View>
              <View style={s.trStrong}>
                <Cell w="70%" style={s.bold}>Saldo inicial</Cell>
                <Cell w="30%" style={[s.bold, s.right]}>{money(c.opening, c.currency)}</Cell>
              </View>
              {c.inflowGroups.map((g) => (
                <View key={g.label} style={s.tr}>
                  <Cell w="70%">{g.label}</Cell>
                  <Cell w="30%" style={s.right}>{money(g.amount, c.currency)}</Cell>
                </View>
              ))}
              <View style={s.trStrong}>
                <Cell w="70%" style={s.bold}>Total de entradas</Cell>
                <Cell w="30%" style={[s.bold, s.right]}>{money(c.inflows, c.currency)}</Cell>
              </View>
              {c.outflowGroups.map((g) => (
                <View key={g.label} style={s.tr}>
                  <Cell w="70%">{g.label}</Cell>
                  <Cell w="30%" style={s.right}>{money(g.amount, c.currency)}</Cell>
                </View>
              ))}
              <View style={s.trStrong}>
                <Cell w="70%" style={s.bold}>Total de salidas</Cell>
                <Cell w="30%" style={[s.bold, s.right]}>{money(-c.outflows, c.currency)}</Cell>
              </View>
              <View style={s.trStrong}>
                <Cell w="70%" style={s.bold}>Flujo neto del periodo</Cell>
                <Cell w="30%" style={[s.bold, s.right, c.net < 0 ? { color: RED } : {}]}>{money(c.net, c.currency)}</Cell>
              </View>
              <View style={s.trStrong}>
                <Cell w="70%" style={s.bold}>Saldo final</Cell>
                <Cell w="30%" style={[s.bold, s.right]}>{money(c.closing, c.currency)}</Cell>
              </View>
            </View>

            <Text style={s.section}>Por cuenta</Text>
            <View style={s.table}>
              <View style={s.th}>
                <Cell w="32%" style={s.thText}>Cuenta</Cell>
                <Cell w="17%" style={[s.thText, s.right]}>Saldo inicial</Cell>
                <Cell w="17%" style={[s.thText, s.right]}>Entradas</Cell>
                <Cell w="17%" style={[s.thText, s.right]}>Salidas</Cell>
                <Cell w="17%" style={[s.thText, s.right]}>Saldo final</Cell>
              </View>
              {c.accounts.map((a) => (
                <View key={a.id} style={s.tr} wrap={false}>
                  <Cell w="32%">{a.name}{a.bank ? ` · ${a.bank}` : ""}</Cell>
                  <Cell w="17%" style={s.right}>{money(a.opening, c.currency)}</Cell>
                  <Cell w="17%" style={s.right}>{money(a.inflows, c.currency)}</Cell>
                  <Cell w="17%" style={s.right}>{money(a.outflows, c.currency)}</Cell>
                  <Cell w="17%" style={s.right}>{money(a.closing, c.currency)}</Cell>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Frame>
    </Document>
  );
}
