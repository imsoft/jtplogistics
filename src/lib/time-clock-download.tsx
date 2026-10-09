/**
 * Descarga del registro del checador en Excel, Word y PDF, desde el navegador.
 * Los tres salen de la misma tabla (time-clock-export.ts) y llevan la misma
 * cara: logo, azul de marca y pie con el lema, igual que los correos. Cada
 * librería se carga solo cuando alguien pide ese formato: pesan, y la tabla no
 * las necesita.
 */

import { BRAND } from "@/lib/email-layout";
import { TIME_CLOCK_EXPORT_HEADERS } from "@/lib/time-clock-export";

export interface TimeClockExport {
  /** "Del 01/10/2026 al 09/10/2026". */
  period: string;
  /** Nombre del archivo para la extensión dada. */
  filename: (ext: string) => string;
  rows: string[][];
}

const TITLE = "REGISTRO DEL CHECADOR";
const COMPANY = "JTP LOGISTICS";
const TAGLINE = "JTP LOGISTICS · EL MEJOR SOCIO COMERCIAL";
const LOGO_PATH = "/images/logo/jtp-logistics.png";
/** Ancho de cada columna, en porcentaje. Suman 100, en el orden de los encabezados. */
/** Sin nombre de fuente, Excel y la vista previa caen en una con serifas. */
const XLSX_FONT = "Arial";
const WIDTHS = [17, 7, 8, 6, 6, 6, 6, 11, 15, 9, 9];

/** "#1447E6" → "1447E6", que es como lo piden Word y Excel. */
const hex = (color: string) => color.replace("#", "").toUpperCase();

function subtitle(data: TimeClockExport): string {
  const n = data.rows.length;
  return `${data.period.toLocaleUpperCase("es-MX")} · ${n} JORNADA${n === 1 ? "" : "S"}`;
}

/** El logo es un adorno: si no carga, el documento sale igual, sin él. */
async function loadLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(LOGO_PATH);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── Excel ───────────────────────────────────────────────────────────────────

export async function downloadTimeClockExcel(data: TimeClockExport) {
  const [ExcelJS, logo] = await Promise.all([import("exceljs").then((m) => m.default), loadLogo()]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY;
  workbook.created = new Date();
  const HEADER_ROW = 5;
  const sheet = workbook.addWorksheet("Checador", {
    // El encabezado de la tabla se queda fijo al bajar.
    views: [{ state: "frozen", ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
    },
    headerFooter: { oddFooter: `&L&8${TAGLINE}&R&8&P / &N` },
  });

  const cols = TIME_CLOCK_EXPORT_HEADERS.length;
  // Proporcionales a las del PDF, para que los tres se parezcan.
  sheet.columns = WIDTHS.map((w) => ({ width: Math.round(w * 1.75) }));

  // Membrete: logo a la izquierda, título y periodo a su lado.
  [1, 2, 3].forEach((r) => (sheet.getRow(r).height = 22));
  sheet.getRow(4).height = 8;
  if (logo) {
    const id = workbook.addImage({ buffer: logo, extension: "png" });
    sheet.addImage(id, { tl: { col: 0.15, row: 0.1 }, ext: { width: 84, height: 84 } });
  }
  sheet.mergeCells(1, 2, 2, cols);
  const title = sheet.getCell(1, 2);
  title.value = TITLE;
  title.font = { name: XLSX_FONT, bold: true, size: 18, color: { argb: `FF${hex(BRAND.blue)}` } };
  title.alignment = { vertical: "middle" };
  sheet.mergeCells(3, 2, 3, cols);
  const sub = sheet.getCell(3, 2);
  sub.value = `${COMPANY} · ${subtitle(data)}`;
  sub.font = { name: XLSX_FONT, size: 10, color: { argb: `FF${hex(BRAND.muted)}` } };
  sub.alignment = { vertical: "top" };

  const border = { style: "thin" as const, color: { argb: `FF${hex(BRAND.border)}` } };

  const head = sheet.getRow(HEADER_ROW);
  head.values = TIME_CLOCK_EXPORT_HEADERS;
  head.height = 24;
  head.eachCell((cell) => {
    cell.font = { name: XLSX_FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex(BRAND.blue)}` } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: border };
  });

  data.rows.forEach((values, i) => {
    const row = sheet.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: XLSX_FONT, size: 10, color: { argb: `FF${hex(BRAND.text)}` } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: border };
      // Renglones alternados, como en las tablas de la app.
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex(BRAND.background)}` } };
      }
    });
  });

  sheet.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: cols } };

  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    data.filename("xlsx")
  );
}

// ─── Word ────────────────────────────────────────────────────────────────────

export async function downloadTimeClockWord(data: TimeClockExport) {
  const [docx, logo] = await Promise.all([import("docx"), loadLogo()]);
  const {
    AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, PageNumber, PageOrientation,
    Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
  } = docx;

  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const line = { style: BorderStyle.SINGLE, size: 4, color: hex(BRAND.border) };
  const font = "Arial";

  const cell = (text: string, i: number, kind: "head" | "odd" | "even") =>
    new TableCell({
      width: { size: WIDTHS[i], type: WidthType.PERCENTAGE },
      margins: { top: 70, bottom: 70, left: 90, right: 90 },
      borders: { top: none, left: none, right: none, bottom: line },
      ...(kind === "head"
        ? { shading: { type: ShadingType.CLEAR, fill: hex(BRAND.blue), color: "auto" } }
        : kind === "even"
          ? { shading: { type: ShadingType.CLEAR, fill: hex(BRAND.background), color: "auto" } }
          : {}),
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              font,
              bold: kind === "head",
              size: 15,
              color: kind === "head" ? "FFFFFF" : hex(BRAND.text),
            }),
          ],
        }),
      ],
    });

  // Membrete sin bordes: logo a la izquierda, título y periodo a su lado.
  const letterhead = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          ...(logo
            ? [
                new TableCell({
                  width: { size: 9, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [
                        new ImageRun({ type: "png", data: logo, transformation: { width: 74, height: 74 } }),
                      ],
                    }),
                  ],
                }),
              ]
            : []),
          new TableCell({
            width: { size: logo ? 91 : 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: TITLE, font, bold: true, size: 36, color: hex(BRAND.blue) })],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `${COMPANY} · ${subtitle(data)}`, font, size: 18, color: hex(BRAND.muted) }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        tableHeader: true,
        children: TIME_CLOCK_EXPORT_HEADERS.map((h, i) => cell(h, i, "head")),
      }),
      ...data.rows.map(
        (row, r) =>
          new TableRow({
            cantSplit: true,
            children: row.map((v, i) => cell(v, i, r % 2 === 1 ? "even" : "odd")),
          })
      ),
    ],
  });

  const footStyle = { font, size: 14, color: hex(BRAND.muted) };

  const doc = new Document({
    creator: COMPANY,
    title: TITLE,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 620, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: hex(BRAND.blue), space: 6 } },
                children: [
                  new TextRun({ ...footStyle, text: `${TAGLINE}   ·   ` }),
                  new TextRun({ ...footStyle, children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children: [
          letterhead,
          // Filete azul bajo el membrete.
          new Paragraph({
            spacing: { before: 120, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(BRAND.blue), space: 1 } },
            children: [],
          }),
          table,
        ],
      },
    ],
  });

  saveBlob(await Packer.toBlob(doc), data.filename("docx"));
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function downloadTimeClockPdf(data: TimeClockExport) {
  const { Document, Font, Image, Page, StyleSheet, Text, View, pdf } = await import("@react-pdf/renderer");
  // Sin esto corta las palabras con guion a media sílaba ("CONEX-IÓN").
  Font.registerHyphenationCallback((word) => [word]);

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 7, color: BRAND.text, paddingTop: 24, paddingBottom: 40, paddingHorizontal: 28 },
    letterhead: { flexDirection: "row", alignItems: "center", paddingBottom: 8, marginBottom: 12, borderBottomWidth: 2, borderBottomColor: BRAND.blue },
    logo: { width: 54, height: 54, marginRight: 12 },
    title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: BRAND.blue, letterSpacing: 0.6 },
    sub: { fontSize: 8, color: BRAND.muted, marginTop: 4, letterSpacing: 0.3 },
    head: { flexDirection: "row", backgroundColor: BRAND.blue },
    th: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 4, letterSpacing: 0.3 },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BRAND.border },
    alt: { backgroundColor: BRAND.background },
    td: { paddingVertical: 4, paddingHorizontal: 4 },
    name: { fontFamily: "Helvetica-Bold" },
    foot: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: BRAND.muted, borderTopWidth: 1, borderTopColor: BRAND.blue, paddingTop: 5, letterSpacing: 0.3 },
  });

  const logoSrc = window.location.origin + LOGO_PATH;

  const blob = await pdf(
    <Document title={TITLE} author={COMPANY}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.letterhead}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, no del DOM */}
          <Image src={logoSrc} style={s.logo} />
          <View>
            <Text style={s.title}>{TITLE}</Text>
            <Text style={s.sub}>{COMPANY} · {subtitle(data)}</Text>
          </View>
        </View>
        {/* fixed: el encabezado de la tabla se repite en cada hoja. */}
        <View style={s.head} fixed>
          {TIME_CLOCK_EXPORT_HEADERS.map((h, i) => (
            <Text key={h} style={[s.th, { width: `${WIDTHS[i]}%` }]}>{h}</Text>
          ))}
        </View>
        {data.rows.map((row, r) => (
          <View key={r} style={r % 2 === 1 ? [s.row, s.alt] : s.row} wrap={false}>
            {row.map((v, i) => (
              <Text key={i} style={[s.td, { width: `${WIDTHS[i]}%` }, i === 0 ? s.name : {}]}>{v}</Text>
            ))}
          </View>
        ))}
        <View style={s.foot} fixed>
          <Text>{TAGLINE}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  ).toBlob();

  saveBlob(blob, data.filename("pdf"));
}
