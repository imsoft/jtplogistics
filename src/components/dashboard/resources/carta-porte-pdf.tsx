import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND as COLORS } from "@/lib/email-layout";
import { pdfSentence, pdfUpper } from "@/lib/pdf-text-case";
import { cartaPorteTotals, readCartaPorte, type CartaPorte, type CartaPorteLocation } from "@/lib/carta-porte";
import { countryLabel, labelOf, stateLabel, SCT_PERMITS, TRAILER_SUBTYPES } from "@/lib/sat-catalogs";

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
  /** Ubicaciones, mercancías y autotransporte capturados en el embarque. */
  sat?: CartaPorte | null;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const day = (iso: string) => {
  const [y, m, d] = (iso ?? "").slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} de ${MONTHS[m - 1]} de ${y}` : "Por confirmar";
};
const v = (s: string | null | undefined) => (s?.trim() ? s.trim() : "—");
/** "2026-03-12T18:00" → "2026-03-12 18:00". */
const dateTime = (s: string, fallbackDay: string) => (s ? s.replace("T", " ") : fallbackDay ? fallbackDay.slice(0, 10) : "—");
/** Número con miles y decimales fijos: "21000" → "21,000.000". */
const fixed = (s: string, digits: number) => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";
};


const s = StyleSheet.create({
  page: { paddingTop: 20, paddingBottom: 36, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 8.5, color: COLORS.text, textTransform: "uppercase" },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COLORS.blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  logo: { width: 170, height: 72, objectFit: "contain" },
  headRight: { alignItems: "flex-end", maxWidth: 400 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.blue },
  folio: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 2 },
  muted: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  notice: { fontSize: 7, color: COLORS.muted, marginTop: 3, textAlign: "right" },
  band: { backgroundColor: COLORS.blue, borderRadius: 3, paddingVertical: 3, marginTop: 6, marginBottom: 3 },
  bandText: { color: COLORS.onBlue, fontFamily: "Helvetica-Bold", fontSize: 9.5, letterSpacing: 1, textAlign: "center" },
  row: { flexDirection: "row" },
  head: { flex: 1, backgroundColor: COLORS.surface, paddingVertical: 2.5, paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: "#FFFFFF" },
  headText: { fontFamily: "Helvetica-Bold", fontSize: 7, color: COLORS.blueDark, textAlign: "center" },
  cell: { flex: 1, paddingVertical: 2.5, paddingHorizontal: 3, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  cellText: { fontSize: 8, textAlign: "center" },
  blank: { flex: 1 },
  gap: { height: 4 },
  totals: { flexDirection: "row", marginTop: 4 },
  totLabel: { backgroundColor: COLORS.surface, color: COLORS.blueDark, paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 8 },
  totValue: { backgroundColor: COLORS.background, paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 8 },
  box: { borderWidth: 0.6, borderColor: COLORS.border, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 6, marginTop: 6 },
  boxText: {},
  boxTitle: { color: COLORS.blue },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  sign: { width: "42%", borderTopWidth: 0.8, borderTopColor: COLORS.text, paddingTop: 5, alignItems: "center" },
  bold: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted },
});

type Pair = [label: string, value: string] | null;

/** Renglones de 5 columnas: encabezado gris y valor debajo, como el CFDI. */
function Grid({ pairs, cols = 5 }: { pairs: Pair[]; cols?: number }) {
  const rows: Pair[][] = [];
  for (let i = 0; i < pairs.length; i += cols) rows.push(pairs.slice(i, i + cols));
  return (
    <View>
      {rows.map((r, i) => {
        const filled = [...r, ...Array(cols - r.length).fill(null)] as Pair[];
        return (
          <View key={i} wrap={false}>
            <View style={s.row}>
              {filled.map((p, j) =>
                p ? (
                  <View key={j} style={s.head}>
                    <Text style={s.headText}>{p[0]}</Text>
                  </View>
                ) : (
                  <View key={j} style={s.blank} />
                )
              )}
            </View>
            <View style={s.row}>
              {filled.map((p, j) => (
                <View key={j} style={s.cell}>
                  <Text style={s.cellText}>{p ? p[1] : ""}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Band({ children }: { children: string }) {
  return (
    <View style={s.band} wrap={false}>
      <Text style={s.bandText}>{children}</Text>
    </View>
  );
}

/**
 * Una ubicación en 2 renglones de 6 columnas. Sin el ID (siempre OR000001 /
 * DE000001) y sin NumRegIdTrib salvo que se haya capturado (solo extranjeros),
 * como en el CFDI de referencia del cliente: así la hoja alcanza para las firmas.
 */
function locationPairs(kind: "origin" | "destination", l: CartaPorteLocation, city: string, address: string, fallbackDay: string): Pair[] {
  const hasAddress = l.street || l.postalCode || l.colony;
  const tipo = kind === "origin" ? "Origen" : "Destino";
  const number = [l.extNumber, l.intNumber].filter(Boolean).join(" int. ");
  return [
    ["Tipo", kind === "destination" && l.distanceKm ? `${tipo} · ${fixed(l.distanceKm, 0)} km` : tipo],
    ["RFC", v(l.rfc)],
    ["Nombre", pdfUpper(v(l.name))],
    ...(l.numRegIdTrib ? ([["NumRegIdTrib", v(l.numRegIdTrib)]] as Pair[]) : []),
    ...(hasAddress
      ? ([
          ["Calle", pdfUpper(v(l.street))],
          ["Número", v(number)],
          ["CP", v(l.postalCode)],
          ["Colonia", pdfUpper(v(l.colony))],
          ["Localidad", pdfUpper(v(l.locality))],
          ["Municipio", pdfUpper(v(l.municipality))],
          ["Estado", pdfUpper(v(stateLabel(l.state)))],
          ["País", pdfUpper(v(countryLabel(l.country)))],
        ] as Pair[])
      : ([["Domicilio", pdfUpper(v(address || city))]] as Pair[])),
    ["Fecha/hora", dateTime(l.dateTime, fallbackDay)],
  ];
}

/** Solo la página: para juntarla con la carta de instrucciones en un mismo PDF. */
export function CartaPortePage({ data, logoUrl }: { data: CartaPorteData; logoUrl: string }) {
  const today = new Date();
  const folio = data.eco ? `ECO ${pdfUpper(data.eco)}` : "Sin ECO";
  const cp = readCartaPorte(data.sat ?? {});
  const goods = cp.goods.filter((g) => g.description || g.satKey || g.weightKg || g.quantity);
  const totals = cartaPorteTotals(cp);
  const t = cp.transport;
  const permit = t.permitType ? (labelOf(SCT_PERMITS, t.permitType) ?? t.permitType).split(" · ")[0] : "—";
  const trailerSub = t.trailerSubtype ? (labelOf(TRAILER_SUBTYPES, t.trailerSubtype) ?? t.trailerSubtype) : "";

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.bar} fixed />
      <View style={s.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf no tiene alt */}
        <Image src={logoUrl} style={s.logo} />
        <View style={s.headRight}>
          <Text style={s.title}>Carta porte</Text>
          <Text style={s.folio}>{folio}</Text>
          <Text style={s.muted}>
            Emitida el {today.getDate()} de {MONTHS[today.getMonth()]} de {today.getFullYear()}
          </Text>
          <Text style={s.notice}>Documento de traslado. No sustituye al CFDI con complemento Carta Porte.</Text>
        </View>
      </View>

      <Band>Servicio</Band>
      <Grid
        cols={5}
        pairs={[
          ["Número ECO", pdfUpper(v(data.eco))],
          ["Cliente", pdfUpper(v(data.client))],
          ["Recolección", day(data.pickupDate)],
          ["Entrega", day(data.deliveryDate)],
          ["Ruta", `${pdfUpper(v(data.origin))} - ${pdfUpper(v(data.destination))}`],
          ["Tipo de unidad", pdfSentence(v(data.unit))],
          ["Producto", pdfSentence(v(data.product))],
          ["Transportista", pdfUpper(v(data.legalName))],
          ["Operador", pdfUpper(v(data.operatorName))],
          ["Celular", v(data.phone)],
        ]}
      />

      <Band>Ubicaciones</Band>
      <Grid cols={6} pairs={locationPairs("origin", cp.origin, data.origin, data.originAddress, data.pickupDate)} />
      <View style={s.gap} />
      <Grid cols={6} pairs={locationPairs("destination", cp.destination, data.destination, data.destinationAddress, data.deliveryDate)} />

      <Band>Mercancías</Band>
      {goods.length === 0 ? (
        <Grid cols={2} pairs={[["Descripción", pdfSentence(v(data.product))], ["Peso en kgs", "—"]]} />
      ) : (
        goods.map((g, i) => (
          <View key={i}>
            {i > 0 && <View style={s.gap} />}
            <Grid
              pairs={[
                ["Bienes transp.", v(g.satKey)],
                ["Descripción", pdfUpper(v(g.description))],
                ["Cantidad", fixed(g.quantity, 6)],
                ["Clave unidad", v(g.unitKey)],
                ["Peso en kgs", fixed(g.weightKg, 3)],
                ...((g.tareKg || g.netKg
                  ? [
                      ["Peso tara", fixed(g.tareKg || "0", 3)],
                      ["Peso neto", fixed(g.netKg || "0", 3)],
                    ]
                  : []) as Pair[]),
              ]}
            />
          </View>
        ))
      )}
      <View style={s.totals} wrap={false}>
        <Text style={[s.totLabel, { width: "20%" }]}>Peso bruto total</Text>
        <Text style={[s.totValue, { width: "20%" }]}>{fixed(String(totals.grossWeightKg), 3)}</Text>
        <Text style={[s.totLabel, { width: "15%" }]}>Unidad peso</Text>
        <Text style={[s.totValue, { width: "10%" }]}>KGM</Text>
        <Text style={[s.totLabel, { width: "20%" }]}>Total mercancías</Text>
        <Text style={[s.totValue, { width: "15%" }]}>{String(totals.count)}</Text>
      </View>
      <View style={s.totals} wrap={false}>
        <Text style={[s.totLabel, { width: "45%" }]}>Logística inversa (recolección / devolución)</Text>
        <Text style={[s.totValue, { width: "15%" }]}>{cp.inverseLogistics ? "Sí" : "No"}</Text>
      </View>

      <Band>Autotransporte</Band>
      <Grid
        pairs={[
          ["Tipo permiso SCT", permit],
          ["Folio permiso SCT", v(t.permitNumber)],
          ["Config. vehicular", v(t.vehicleConfig)],
          ["Placa unidad", v(t.plates || data.truck)],
          ["Modelo unidad", v(t.modelYear)],
          ["Aseguradora resp. civil", pdfUpper(v(t.civilInsurer))],
          ["Póliza resp. civil", v(t.civilPolicy)],
          ["Peso bruto vehicular", t.grossVehicleWeight ? fixed(t.grossVehicleWeight, 2) : "—"],
          ["Aseguradora carga", pdfUpper(v(t.cargoInsurer))],
          ["Póliza carga", v(t.cargoPolicy)],
          ["Prima seguro carga", t.cargoPremium ? `$${fixed(t.cargoPremium, 2)}` : "—"],
          ["Remolque", trailerSub ? trailerSub.split(" · ")[0] : "—"],
          ["Placa remolque", v(t.trailerPlates || data.trailer)],
        ]}
      />

      {data.comments?.trim() ? (
        // Compacto (título dentro del recuadro) para que las firmas quepan en la misma hoja.
        <View wrap={false} style={[s.box, { flexDirection: "row", gap: 4 }]}>
          <Text style={s.boxTitle}>Observaciones:</Text>
          <Text style={[s.boxText, { flex: 1 }]}>{data.comments.trim()}</Text>
        </View>
      ) : null}

      <View style={s.signs} wrap={false}>
        <View style={s.sign}>
          <Text style={s.bold}>JTP LOGISTICS</Text>
          <Text style={s.muted}>Nombre y firma</Text>
        </View>
        <View style={s.sign}>
          <Text style={s.bold}>{pdfUpper(v(data.legalName))}</Text>
          <Text style={s.muted}>Transportista · nombre y firma</Text>
        </View>
      </View>

      <View style={s.footer} fixed>
        <Text>JTP Logistics · El mejor socio comercial</Text>
        <Text>jtp.com.mx</Text>
      </View>
    </Page>
  );
}

/** Carta porte imprimible del embarque: documento de traslado, no es el CFDI. */
export function CartaPortePdf({ data, logoUrl }: { data: CartaPorteData; logoUrl: string }) {
  return (
    <Document title={`Carta porte ${data.eco || ""}`.trim()}>
      <CartaPortePage data={data} logoUrl={logoUrl} />
    </Document>
  );
}
