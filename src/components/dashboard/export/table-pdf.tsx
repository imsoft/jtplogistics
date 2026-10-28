import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND as COLORS } from "@/lib/email-layout";
import type { ExportData } from "@/lib/table-export";

/** PDF de cualquier tabla: logo, título, fecha, filtros y la tabla con el estilo de JTP. */
const s = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 36, paddingHorizontal: 28, fontFamily: "Helvetica", fontSize: 7.5, color: COLORS.text },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  logo: { width: 110, height: 52, objectFit: "contain" },
  headerRight: { alignItems: "flex-end", maxWidth: 420 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.blue, textTransform: "uppercase", letterSpacing: 0.5 },
  line: { fontSize: 7.5, color: COLORS.muted, marginTop: 2, textAlign: "right" },
  table: { borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4 },
  headRow: { flexDirection: "row", backgroundColor: COLORS.blue },
  th: { flex: 1, color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 7, paddingVertical: 5, paddingHorizontal: 4, textTransform: "uppercase" },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: COLORS.border },
  zebra: { backgroundColor: COLORS.background },
  td: { flex: 1, paddingVertical: 4, paddingHorizontal: 4 },
  footer: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: COLORS.muted },
});

export function TablePdf({ title, data, logoUrl, subtitle }: { title: string; data: ExportData; logoUrl: string; subtitle?: string }) {
  const generated = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" });
  // Muchas columnas no caben en vertical.
  const landscape = data.headers.length > 5;
  return (
    <Document title={title}>
      <Page size="LETTER" orientation={landscape ? "landscape" : "portrait"} style={s.page}>
        <View style={s.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf no tiene alt */}
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.line}>{subtitle}</Text> : null}
            <Text style={s.line}>
              {data.rows.length} {data.rows.length === 1 ? "registro" : "registros"} · Generado el {generated}
            </Text>
          </View>
        </View>
        <View style={s.table}>
          <View style={s.headRow} fixed>
            {data.headers.map((h, i) => (
              <Text key={i} style={s.th}>{h}</Text>
            ))}
          </View>
          {data.rows.map((r, i) => (
            <View key={i} style={i % 2 ? [s.row, s.zebra] : s.row} wrap={false}>
              {r.map((c, j) => (
                <Text key={j} style={s.td}>{c}</Text>
              ))}
            </View>
          ))}
        </View>
        <View style={s.footer} fixed>
          <Text>JTP Logistics · El mejor socio comercial</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
