/**
 * PDF del acta administrativa con la cara de JTP: logo en cada hoja, azul de
 * marca en títulos y pie con el lema. El texto es el del machote de RH; lo que
 * allá iba en amarillo sale de lo que se capturó.
 */

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND } from "@/lib/email-layout";
import { pdfSentence, pdfUpper } from "@/lib/pdf-text-case";
import {
  COMPANY_ADDRESS,
  COMPANY_CITY,
  COMPANY_LEGAL_NAME,
  continuation,
  longDate,
  splitDate,
  timeOrBlank,
  yearInWords,
  type ActaData,
} from "@/lib/acta-administrativa";

// Sin esto corta las palabras con guion a media sílaba.
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.55, color: BRAND.text, paddingTop: 92, paddingBottom: 60, paddingHorizontal: 64 },
  header: { position: "absolute", top: 26, left: 64, right: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: BRAND.blue, paddingBottom: 8 },
  logo: { width: 52, height: 52 },
  headerText: { fontSize: 7.5, color: BRAND.muted, letterSpacing: 0.4, textAlign: "right" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND.blue, textAlign: "center", marginBottom: 14, letterSpacing: 0.8 },
  section: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BRAND.blue, textAlign: "center", marginTop: 14, marginBottom: 8, letterSpacing: 0.6 },
  p: { textAlign: "justify", marginBottom: 8 },
  b: { fontFamily: "Helvetica-Bold" },
  item: { flexDirection: "row", marginBottom: 8, paddingLeft: 12 },
  itemNum: { width: 22, fontFamily: "Helvetica-Bold" },
  itemBody: { flex: 1, textAlign: "justify" },
  statementBox: { borderWidth: 0.75, borderColor: BRAND.border, borderRadius: 4, padding: 10, minHeight: 150, marginBottom: 8 },
  writeLine: { borderBottomWidth: 0.75, borderBottomColor: BRAND.border, height: 22 },
  sigGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 46 },
  sig: { width: "44%", alignItems: "center", textAlign: "center" },
  sigLine: { width: "100%", borderTopWidth: 0.75, borderTopColor: BRAND.text, marginBottom: 4 },
  sigSmall: { fontSize: 9.5, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 64, right: 64, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: BRAND.muted, borderTopWidth: 0.75, borderTopColor: BRAND.blue, paddingTop: 5, letterSpacing: 0.3 },
});

const AREA_LABEL: Record<ActaData["area"], string> = {
  operativa: "operativa",
  financiera: "financiera",
  administrativa: "administrativa",
};

function Signature({ top, name, lines }: { top?: string; name: string; lines: string[] }) {
  return (
    <View style={s.sig} wrap={false}>
      <View style={s.sigLine} />
      {top ? <Text style={s.sigSmall}>{top}</Text> : null}
      <Text style={[s.sigSmall, s.b]}>{name}</Text>
      {lines.map((l) => (
        <Text key={l} style={s.sigSmall}>{l}</Text>
      ))}
    </View>
  );
}

export function ActaPdf({ data, logoUrl }: { data: ActaData; logoUrl: string }) {
  const { day, month, year } = splitDate(data.date);
  const responsible = pdfUpper(data.responsibleName);
  const employee = pdfUpper(data.employeeName);
  const position = pdfUpper(data.employeePosition);
  const title = pdfSentence(data.responsibleTitle);
  const statement = data.statement.trim();

  return (
    <Document title={`Acta administrativa - ${employee}`} author="JTP Logistics">
      <Page size="LETTER" style={s.page}>
        <View style={s.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, no del DOM */}
          <Image src={logoUrl} style={s.logo} />
          <Text style={s.headerText}>{COMPANY_LEGAL_NAME}{"\n"}ACTA ADMINISTRATIVA</Text>
        </View>

        <Text style={s.title}>ACTA ADMINISTRATIVA</Text>

        <Text style={s.p}>
          En la ciudad de {COMPANY_CITY}, siendo las <Text style={s.b}>{timeOrBlank(data.startTime)}</Text> horas
          del día <Text style={s.b}>{day}</Text> de <Text style={s.b}>{month}</Text> de{" "}
          <Text style={s.b}>{year}</Text> ({yearInWords(year)}), se encuentran reunidos{" "}
          <Text style={s.b}>{responsible}</Text>, {title.charAt(0).toLocaleLowerCase("es-MX") + title.slice(1)}, y{" "}
          <Text style={s.b}>{employee}</Text>, <Text style={s.b}>{position}</Text>, dentro de las instalaciones
          de la Sociedad Mercantil denominada <Text style={s.b}>{COMPANY_LEGAL_NAME}</Text>, con domicilio físico
          en <Text style={s.b}>{COMPANY_ADDRESS}</Text>, y quienes de manera voluntaria constatan los hechos que
          se describen en la presente acta administrativa los siguientes:
        </Text>

        <Text style={s.section}>ANTECEDENTES</Text>
        <View style={s.item}>
          <Text style={s.itemNum}>I.</Text>
          <Text style={s.itemBody}>
            En su carácter de <Text style={s.b}>{position}</Text>, el colaborador desempeña funciones{" "}
            {continuation(data.duties)}.
          </Text>
        </View>

        <Text style={s.section}>HECHOS</Text>
        <View style={s.item}>
          <Text style={s.itemNum}>I.</Text>
          <Text style={s.itemBody}>
            Siendo el día <Text style={s.b}>{longDate(data.incidentDate)}</Text>, el colaborador omitió{" "}
            {continuation(data.incidentDescription)}.
          </Text>
        </View>
        <View style={s.item}>
          <Text style={s.itemNum}>II.</Text>
          <View style={s.itemBody}>
            <Text style={s.p}>
              Posteriormente, el día <Text style={s.b}>{longDate(data.meetingDate || data.date)}</Text>, en reunión
              particular se solicitó el informe para justificar el motivo de las omisiones realizadas
              {data.employeeResponse.trim()
                ? `, a lo que su respuesta fue que ${continuation(data.employeeResponse)}.`
                : "."}
            </Text>
            <Text style={{ textAlign: "justify" }}>
              Omitió {continuation(data.breach)}, cumplir con los protocolos laborales y solicitar los permisos
              correspondientes para efecto de que las labores programadas y correspondientes a su cargo no
              sufrieran desatención por parte de la empresa, especialmente cuando sus actividades requieren
              seguimiento continuo de clientes y proveedores.
            </Text>
          </View>
        </View>

        <Text style={s.section}>MANIFESTACIÓN DEL COLABORADOR</Text>
        <Text style={s.p}>
          En este acto se concede el uso de la voz a <Text style={s.b}>C. {employee}</Text> para que manifieste
          libremente lo que a su derecho e interés corresponda respecto de los hechos anteriormente descritos.
        </Text>
        <Text style={s.p}>
          En particular, podrá señalar las razones y forma de aplicación y seguimiento de las indicaciones, además
          de explicar qué conocimiento tuvo de la operación, qué instrucciones fueron giradas, qué mecanismos de
          supervisión se encontraban activos y cualquier otra circunstancia que considere relevante. El
          colaborador podrá acompañar o identificar mensajes, correos electrónicos, instrucciones, reportes u
          otros elementos que considere pertinentes.
        </Text>
        <Text style={[s.p, s.b]}>Manifestación:</Text>
        {/* Si no se capturó, queda el espacio para que se escriba a mano al firmar. */}
        <View style={s.statementBox} wrap={false}>
          {statement ? (
            <Text style={{ textAlign: "justify" }}>{statement}</Text>
          ) : (
            Array.from({ length: 6 }, (_, i) => <View key={i} style={s.writeLine} />)
          )}
        </View>

        <Text style={s.section}>DETERMINACIÓN</Text>
        <Text style={s.p}>
          La empresa hace constar que los hechos descritos serán evaluados juntamente con la documentación{" "}
          <Text style={s.b}>{AREA_LABEL[data.area]}</Text>, comunicaciones, reportes de monitoreo y demás evidencia
          disponible.
        </Text>
        <Text style={s.p}>
          La presente acta tiene por objeto dejar constancia formal de los hechos y de la versión del colaborador,
          sin prejuzgar sobre responsabilidades distintas de aquellas que pudieran derivarse del cumplimiento de
          sus funciones laborales.
        </Text>
        <Text style={s.p}>
          La empresa solicita y determina que el colaborador permanezca en su cargo hasta nuevo aviso; asimismo,
          reserva la determinación de las medidas administrativas, organizacionales o laborales que correspondan,
          previa revisión integral de los hechos u omisiones en que haya incurrido el colaborador respecto al
          reglamento interior de trabajo y conforme a la legislación laboral aplicable.
        </Text>

        <View wrap={false}>
          <Text style={[s.p, { marginTop: 6 }]}>
            Leída la presente acta y enteradas las personas comparecientes de su contenido y alcance, se firma para
            constancia a las <Text style={s.b}>{timeOrBlank(data.endTime)}</Text> horas del mismo día de su inicio,
            firmando al margen y al calce los que en ella intervinieron para constancia y validez legal.
          </Text>
          <View style={s.sigGrid}>
            <Signature top="Por la empresa" name={responsible} lines={[title, COMPANY_LEGAL_NAME]} />
            <Signature name={`C. ${employee}`} lines={[position]} />
          </View>
          <View style={s.sigGrid}>
            <Signature top="Testigo 1" name={pdfUpper(data.witness1) || " "} lines={[]} />
            <Signature top="Testigo 2" name={pdfUpper(data.witness2) || " "} lines={[]} />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>JTP LOGISTICS · EL MEJOR SOCIO COMERCIAL</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
