import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

export interface InstructionLetterData {
  eco: string;
  client: string;
  product: string;
  pickupDate: string;
  deliveryDate: string;
  pickupTime?: string;
  deliveryTime?: string;
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
  originContact?: string;
  destinationContact?: string;
  originPhone?: string;
  destinationPhone?: string;
  originCp?: string;
  destinationCp?: string;
  originCity?: string;
  originState?: string;
  originCountry?: string;
  destinationCity?: string;
  destinationState?: string;
  destinationCountry?: string;
  quantityBoxes?: string | number;
  comments?: string;
}

const C = {
  navy: "#17365D",
  steelBlue: "#538CD5",
  cream: "#EEECE1",
  crimson: "#953734",
  teal: "#31859B",
  black: "#000000",
  white: "#FFFFFF",
};

const MONTHS_UPPER = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

const DAYS_UPPER = [
  "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO",
];

function formatFullDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "POR CONFIRMAR";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso.toUpperCase();
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = DAYS_UPPER[dt.getUTCDay()] ?? "";
  const dd = String(d).padStart(2, "0");
  const monthName = MONTHS_UPPER[m - 1] ?? "";
  return `${dayName} ${dd} DE ${monthName} DEL ${y}`.trim();
}

function formatEco(eco: string | null | undefined): string {
  const e = (eco || "").trim().toUpperCase();
  if (!e) return "—";
  if (e.startsWith("J -") || e.startsWith("J-")) {
    return e.replace(/^J\s*-\s*/, "J - ");
  }
  return e.startsWith("J") ? e : `J - ${e}`;
}

const STATE_MAP: Record<string, string> = {
  CHIH: "CHIHUAHUA",
  CHIHUAHUA: "CHIHUAHUA",
  CDMX: "MÉXICO",
  DF: "MÉXICO",
  MEX: "MÉXICO",
  EDOMEX: "MÉXICO",
  "CIUDAD DE MEXICO": "MÉXICO",
  "CIUDAD DE MÉXICO": "MÉXICO",
  JAL: "JALISCO",
  JALISCO: "JALISCO",
  NL: "NUEVO LEÓN",
  "NUEVO LEON": "NUEVO LEÓN",
  QRO: "QUERÉTARO",
  QUERETARO: "QUERÉTARO",
  GTO: "GUANAJUATO",
  GUANAJUATO: "GUANAJUATO",
  PUE: "PUEBLA",
  PUEBLA: "PUEBLA",
  VER: "VERACRUZ",
  VERACRUZ: "VERACRUZ",
  SON: "SONORA",
  SONORA: "SONORA",
  COAH: "COAHUILA",
  COAHUILA: "COAHUILA",
  TAMPS: "TAMAULIPAS",
  TAMAULIPAS: "TAMAULIPAS",
  SLP: "SAN LUIS POTOSÍ",
  "SAN LUIS POTOSI": "SAN LUIS POTOSÍ",
  BC: "BAJA CALIFORNIA",
  BCS: "BAJA CALIFORNIA SUR",
  SIN: "SINALOA",
  SINALOA: "SINALOA",
  AGS: "AGUASCALIENTES",
  AGUASCALIENTES: "AGUASCALIENTES",
  MICH: "MICHOACÁN",
  MICHOACAN: "MICHOACÁN",
  YUC: "YUCATÁN",
  YUCATAN: "YUCATÁN",
};

interface ParsedLocation {
  header: string;
  city: string;
  state: string;
  country: string;
  contact: string;
  phone: string;
  cp: string;
  placeName: string;
  streetLines: string[];
}

function parseLocation(
  locationStr: string | null | undefined,
  addressStr: string | null | undefined,
  explicit: {
    contact?: string;
    phone?: string;
    cp?: string;
    city?: string;
    state?: string;
    country?: string;
  },
  fallbackContact?: string,
  fallbackPhone?: string
): ParsedLocation {
  const loc = (locationStr || "").trim();
  let city = explicit.city?.trim() || "";
  let state = explicit.state?.trim() || "";
  const country = explicit.country?.trim() || "MÉXICO";

  if (!city || !state) {
    if (loc.includes(",")) {
      const parts = loc.split(",").map((s) => s.trim());
      if (!city) city = parts[0] ?? "";
      if (!state && parts[1]) {
        const rawState = parts[1].replace(/\./g, "").toUpperCase();
        state = STATE_MAP[rawState] || parts[1];
      }
    } else {
      if (!city) city = loc;
      if (!state) {
        const upperCity = city.toUpperCase();
        state = STATE_MAP[upperCity] || upperCity;
      }
    }
  }

  let contact = explicit.contact?.trim() || fallbackContact?.trim() || "";
  let phone = explicit.phone?.trim() || fallbackPhone?.trim() || "";
  let cp = explicit.cp?.trim() || "";

  let rawLines = (addressStr || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawLines.length === 1 && rawLines[0].includes(",") && !rawLines[0].includes("\n")) {
    const parts = rawLines[0].split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      rawLines = parts;
    }
  }

  const cleanLines: string[] = [];
  for (const line of rawLines) {
    const isCpOnly = /^(?:c\.?p\.?[:\s]*)?(\d{5})$/i.test(line);
    const isPhoneOnly = /^[\d\s\-()]{7,15}$/.test(line);
    const cpMatch = line.match(/\b(\d{5})\b/);

    if (isCpOnly) {
      if (!cp) cp = line.replace(/[^\d]/g, "");
    } else if (isPhoneOnly) {
      if (!phone) phone = line;
    } else {
      if (!cp && cpMatch) {
        cp = cpMatch[1];
      }
      cleanLines.push(line);
    }
  }

  let placeName = "";
  let streetLines: string[] = [];
  if (cleanLines.length > 1) {
    placeName = cleanLines[0];
    streetLines = cleanLines.slice(1);
  } else if (cleanLines.length === 1) {
    placeName = cleanLines[0];
  }

  return {
    header: loc.toUpperCase() || "—",
    city: city.toUpperCase() || "—",
    state: state.toUpperCase() || "—",
    country: country.toUpperCase() || "MÉXICO",
    contact: contact.toUpperCase() || "—",
    phone: phone || "—",
    cp: cp || "—",
    placeName: placeName.toUpperCase(),
    streetLines: streetLines.map((s) => s.toUpperCase()),
  };
}

const s = StyleSheet.create({
  page: {
    padding: 16,
    backgroundColor: C.white,
    fontFamily: "Helvetica",
  },
  outerFrame: {
    height: "100%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleBadge: {
    width: 200,
    height: 25,
    backgroundColor: C.navy,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  titleBadgeText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
  logo: {
    width: 150,
    height: 68,
    objectFit: "contain",
  },
  pickupRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  pickupLabelBox: {
    width: 115,
    height: 28,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  pickupLabelText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textAlign: "center",
    lineHeight: 1.15,
  },
  pickupValueBox: {
    width: 205,
    height: 28,
    backgroundColor: C.steelBlue,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  pickupDateText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textAlign: "center",
  },
  pickupTimeText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textAlign: "center",
    marginTop: 1,
  },
  locationSection: {
    marginBottom: 9,
  },
  locHeaderRow: {
    flexDirection: "row",
  },
  locHeaderLeft: {
    width: 105,
    height: 18,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  locHeaderRight: {
    width: 165,
    height: 18,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  locHeaderText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textAlign: "center",
  },
  locBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  locLeftTable: {
    width: 270,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableLabelCell: {
    width: 105,
    backgroundColor: C.white,
    borderWidth: 1.2,
    borderColor: C.black,
    borderTopWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tableLabelText: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    textAlign: "center",
  },
  tableValueCell: {
    width: 165,
    backgroundColor: C.cream,
    borderWidth: 1.2,
    borderColor: C.black,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tableValueTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textAlign: "center",
  },
  tableValueText: {
    fontFamily: "Helvetica",
    fontSize: 8,
    textAlign: "center",
    lineHeight: 1.2,
  },
  locRightTable: {
    width: 175,
    marginTop: 4,
  },
  locRightRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 5,
  },
  locRightLabel: {
    width: 60,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    textAlign: "right",
    paddingRight: 6,
  },
  locRightBox: {
    width: 104,
    height: 20,
    backgroundColor: C.cream,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  locRightText: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    textAlign: "center",
  },
  deliveryDateRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 8,
  },
  deliveryDateLabel: {
    width: 110,
    height: 20,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  deliveryDateValue: {
    width: 155,
    height: 20,
    backgroundColor: C.steelBlue,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  deliveryHourLabel: {
    width: 60,
    height: 20,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  deliveryHourValue: {
    width: 65,
    height: 20,
    backgroundColor: C.steelBlue,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  deliveryDateText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textAlign: "center",
  },
  unitSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  unitLeftCol: {
    width: 300,
  },
  unitRow1: {
    flexDirection: "row",
    marginBottom: 6,
  },
  unitTypeLabel: {
    width: 90,
    height: 18,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  unitTypeValue: {
    width: 205,
    height: 18,
    backgroundColor: C.white,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  unitRow2: {
    flexDirection: "row",
  },
  unitQtyLabel: {
    width: 98,
    height: 18,
    backgroundColor: C.navy,
    borderWidth: 1.2,
    borderColor: C.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  unitQtyValue: {
    width: 197,
    height: 18,
    backgroundColor: C.white,
    borderWidth: 1.2,
    borderColor: C.black,
    borderLeftWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  productBox: {
    width: 295,
    height: 22,
    backgroundColor: C.white,
    borderWidth: 1.2,
    borderColor: C.black,
    borderTopWidth: 0,
    justifyContent: "center",
    paddingLeft: 8,
  },
  productText: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
  },
  ecoBoxContainer: {
    width: 98,
    marginTop: 2,
  },
  ecoHeader: {
    height: 22,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
  },
  ecoHeaderText: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  ecoValueBox: {
    height: 24,
    backgroundColor: C.cream,
    justifyContent: "center",
    alignItems: "center",
  },
  ecoValueText: {
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  driverSection: {
    marginTop: 10,
    paddingLeft: 12,
  },
  driverText: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: C.black,
    lineHeight: 1.35,
  },
  warningSection: {
    marginTop: 14,
    paddingHorizontal: 4,
  },
  warningLine1Container: {
    flexDirection: "row",
    alignItems: "flex-end",
    alignSelf: "flex-start",
  },
  warningUnderlineRed: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.crimson,
    paddingBottom: 1,
  },
  warningUnderlineTeal: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.teal,
    paddingBottom: 1,
  },
  warningLine2Container: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.crimson,
    paddingBottom: 1,
    marginTop: 3,
    alignSelf: "flex-start",
  },
  warningTextRed: {
    color: C.crimson,
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
  },
  warningTextTeal: {
    color: C.teal,
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
  },
});

export function InstructionLetterPdf({ data, logoUrl }: { data: InstructionLetterData; logoUrl?: string }) {
  const origin = parseLocation(
    data.origin,
    data.originAddress,
    {
      contact: data.originContact,
      phone: data.originPhone,
      cp: data.originCp,
      city: data.originCity,
      state: data.originState,
      country: data.originCountry,
    },
    data.originContact || data.client,
    data.originPhone || data.phone
  );

  const destination = parseLocation(
    data.destination,
    data.destinationAddress,
    {
      contact: data.destinationContact,
      phone: data.destinationPhone,
      cp: data.destinationCp,
      city: data.destinationCity,
      state: data.destinationState,
      country: data.destinationCountry,
    },
    data.destinationContact || data.client,
    data.destinationPhone || data.phone
  );

  const plates = [data.truck, data.trailer].filter(Boolean).join(" / ");
  const effectiveLogoUrl = logoUrl || "/images/logo/jtp-instruction-logo.jpg";

  const renderLocationBlock = (
    title: string,
    loc: ParsedLocation
  ) => (
    <View style={s.locationSection}>
      <View style={s.locHeaderRow}>
        <View style={s.locHeaderLeft}>
          <Text style={s.locHeaderText}>{title}</Text>
        </View>
        <View style={s.locHeaderRight}>
          <Text style={s.locHeaderText}>{loc.header}</Text>
        </View>
      </View>
      <View style={s.locBodyRow}>
        <View style={s.locLeftTable}>
          <View style={s.tableRow}>
            <View style={[s.tableLabelCell, { height: 26 }]}>
              <Text style={s.tableLabelText}>CONTACTO:</Text>
            </View>
            <View style={[s.tableValueCell, { height: 26 }]}>
              <Text style={s.tableValueTextBold}>{loc.contact}</Text>
            </View>
          </View>
          <View style={s.tableRow}>
            <View style={[s.tableLabelCell, { minHeight: 44 }]}>
              <Text style={s.tableLabelText}>CALLE Y NUMERO:</Text>
            </View>
            <View style={[s.tableValueCell, { minHeight: 44 }]}>
              {loc.placeName ? (
                <Text style={s.tableValueTextBold}>{loc.placeName}</Text>
              ) : null}
              {loc.streetLines.map((line, idx) => (
                <Text key={idx} style={s.tableValueText}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={s.tableRow}>
            <View style={[s.tableLabelCell, { height: 24 }]}>
              <Text style={s.tableLabelText}>C.P.:</Text>
            </View>
            <View style={[s.tableValueCell, { height: 24 }]}>
              <Text style={s.tableValueText}>{loc.cp}</Text>
            </View>
          </View>
          <View style={s.tableRow}>
            <View style={[s.tableLabelCell, { height: 24 }]}>
              <Text style={s.tableLabelText}>TELEFONOS:</Text>
            </View>
            <View style={[s.tableValueCell, { height: 24 }]}>
              <Text style={s.tableValueText}>{loc.phone}</Text>
            </View>
          </View>
        </View>
        <View style={s.locRightTable}>
          <View style={s.locRightRow}>
            <Text style={s.locRightLabel}>CIUDAD:</Text>
            <View style={s.locRightBox}>
              <Text style={s.locRightText}>{loc.city}</Text>
            </View>
          </View>
          <View style={s.locRightRow}>
            <Text style={s.locRightLabel}>ESTADO:</Text>
            <View style={s.locRightBox}>
              <Text style={s.locRightText}>{loc.state}</Text>
            </View>
          </View>
          <View style={s.locRightRow}>
            <Text style={s.locRightLabel}>PAIS:</Text>
            <View style={s.locRightBox}>
              <Text style={s.locRightText}>{loc.country}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Document title={`Carta de instrucciones ${data.eco || ""}`.trim()}>
      <Page size={[540, 720]} style={s.page}>
        <View style={s.outerFrame}>
          {/* Encabezado: Título y Logotipo */}
          <View style={s.headerRow}>
            <View style={s.titleBadge}>
              <Text style={s.titleBadgeText}>CARTA DE INSTRUCCIONES</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={effectiveLogoUrl} style={s.logo} />
          </View>

          {/* Fecha y hora de recolección */}
          <View style={s.pickupRow}>
            <View style={s.pickupLabelBox}>
              <Text style={s.pickupLabelText}>{"FECHA Y HORA DE\nRECOLECCION"}</Text>
            </View>
            <View style={s.pickupValueBox}>
              <Text style={s.pickupDateText}>{formatFullDate(data.pickupDate)}</Text>
              <Text style={s.pickupTimeText}>{data.pickupTime || "12:00 PM"}</Text>
            </View>
          </View>

          {/* Domicilio a cargar */}
          {renderLocationBlock("DOMICILIO A CARGAR", origin)}

          {/* Domicilio a descargar */}
          {renderLocationBlock("DOMICILIO A DESCARGAR", destination)}

          {/* Fecha de entrega */}
          <View style={s.deliveryDateRow}>
            <View style={s.deliveryDateLabel}>
              <Text style={s.deliveryDateText}>FECHA DE ENTREGA</Text>
            </View>
            <View style={s.deliveryDateValue}>
              <Text style={s.deliveryDateText}>{formatFullDate(data.deliveryDate)}</Text>
            </View>
            <View style={s.deliveryHourLabel}>
              <Text style={s.deliveryDateText}>HORA</Text>
            </View>
            <View style={s.deliveryHourValue}>
              <Text style={s.deliveryDateText}>{data.deliveryTime || "08:00 AM"}</Text>
            </View>
          </View>

          {/* Tipo de caja, cantidad y ECO */}
          <View style={s.unitSection}>
            <View style={s.unitLeftCol}>
              <View style={s.unitRow1}>
                <View style={s.unitTypeLabel}>
                  <Text style={s.locHeaderText}>TIPO DE CAJA</Text>
                </View>
                <View style={s.unitTypeValue}>
                  <Text style={s.tableValueText}>
                    {(data.unit || 'CAJA SECA DE 53"').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={s.unitRow2}>
                <View style={s.unitQtyLabel}>
                  <Text style={s.locHeaderText}>CANTIDAD DE CAJAS</Text>
                </View>
                <View style={s.unitQtyValue}>
                  <Text style={s.tableValueText}>
                    {String(data.quantityBoxes || "1")}
                  </Text>
                </View>
              </View>
              <View style={s.productBox}>
                <Text style={s.productText}>
                  {(data.product || "MISCELANEOS").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={s.ecoBoxContainer}>
              <View style={s.ecoHeader}>
                <Text style={s.ecoHeaderText}>ECO</Text>
              </View>
              <View style={s.ecoValueBox}>
                <Text style={s.ecoValueText}>{formatEco(data.eco)}</Text>
              </View>
            </View>
          </View>

          {/* Chofer, placas y teléfono */}
          <View style={s.driverSection}>
            <Text style={s.driverText}>
              NOMBRE DEL CHOFER{data.operatorName ? `: ${data.operatorName.toUpperCase()}` : ""}
            </Text>
            <Text style={s.driverText}>
              NUMERO DE PLACAS{plates ? `: ${plates.toUpperCase()}` : ""}
            </Text>
            <Text style={s.driverText}>
              NUMERO DE TELEFONO{data.phone ? `: ${data.phone}` : ""}
            </Text>
          </View>

          {/* Aviso final */}
          <View style={s.warningSection}>
            <View style={s.warningLine1Container}>
              <View style={s.warningUnderlineRed}>
                <Text style={s.warningTextRed}>*ES MUY IMPORTANTE QUE SE REPORTEN DE PARTE DE </Text>
              </View>
              <View style={s.warningUnderlineTeal}>
                <Text style={s.warningTextTeal}>JTP LOGISTICS </Text>
              </View>
              <View style={s.warningUnderlineRed}>
                <Text style={s.warningTextRed}>PARA QUE LES </Text>
              </View>
            </View>
            <View style={s.warningLine2Container}>
              <Text style={s.warningTextRed}>HAGAN LA ENTREGA Y RECIBIMIENTO DE MERCANCIA</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
