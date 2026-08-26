"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { MAINTENANCE_KIND_LABELS, MAINTENANCE_STATUS_LABELS } from "@/lib/support";

// Los colores de la plataforma, en hexadecimal.
const BRAND = "#1447E6";
const BRAND_DARK = "#193CB8";
const ROW = "#EAF1FF";
const WHITE = "#FFFFFF";
const TEXT = "#09090B";
const MUTED = "#57637D";
const LINE = "#D7DFEE";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: TEXT, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  // El PNG del logo es cuadrado: la caja también, para que no se encoja.
  logo: { width: 96, height: 96, objectFit: "contain" },
  headerRight: { alignItems: "flex-end", maxWidth: 260 },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 },
  headerLine: { fontSize: 8.5, color: MUTED, textAlign: "right", marginTop: 3 },

  banner: { backgroundColor: BRAND, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 10 },
  bannerText: { color: WHITE, fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1 },

  // ── Resumen ──
  summary: { flexDirection: "row", gap: 8, marginBottom: 12 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 8 },
  cardLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BRAND, marginTop: 2 },

  // ── Ficha de cada mantenimiento ──
  item: { borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 8, overflow: "hidden" },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: ROW, paddingVertical: 5, paddingHorizontal: 8 },
  itemTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  itemTag: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND_DARK },
  itemBody: { padding: 8 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 78, fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { flex: 1, fontSize: 8.5 },
  findings: { marginTop: 4, backgroundColor: ROW, borderRadius: 4, padding: 6 },
  findingsLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  photos: { flexDirection: "row", gap: 6, marginTop: 6 },
  photo: { width: 84, height: 84, objectFit: "cover", borderRadius: 4 },

  empty: { borderWidth: 1, borderColor: LINE, borderStyle: "dashed", borderRadius: 6, padding: 20, textAlign: "center", color: MUTED, fontSize: 9 },

  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: MUTED },
});

export interface ReportItem {
  id: string;
  kind: keyof typeof MAINTENANCE_KIND_LABELS;
  status: keyof typeof MAINTENANCE_STATUS_LABELS;
  description: string;
  findings: string | null;
  scheduledFor: string;
  performedAt: string | null;
  photos: { url: string }[] | null;
  laptop: { name: string; serialNumber?: string | null; assignedTo?: { name: string } | null } | null;
  phone: { name: string; serialNumber?: string | null; assignedTo?: { name: string } | null } | null;
  technician: { name: string };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso));
}

/**
 * Miniatura de Cloudinary: sin esto el PDF descarga la foto original de varios
 * megas por cada evidencia y tarda una eternidad en generarse.
 */
function thumb(url: string): string {
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/w_320,h_320,c_fill,q_auto/") : url;
}

interface Props {
  items: ReportItem[];
  from: string;
  to: string;
  /** Qué se incluyó: todos, solo preventivos o solo correctivos. */
  kindLabel: string;
  logoUrl: string;
  generatedBy: string;
  /** Máximo de fotos por mantenimiento, para que el archivo no se dispare. */
  maxPhotos?: number;
}

export function MaintenanceReportPdf({
  items,
  from,
  to,
  kindLabel,
  logoUrl,
  generatedBy,
  maxPhotos = 3,
}: Props) {
  const done = items.filter((m) => m.status === "done").length;
  const preventive = items.filter((m) => m.kind === "preventive").length;
  const corrective = items.filter((m) => m.kind === "corrective").length;
  const generated = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  return (
    <Document title={`Mantenimientos ${from} a ${to}`}>
      <Page size="A4" style={s.page}>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>JTP Logistics · Control de mantenimiento de equipo</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

        <View style={s.header} fixed>
          <Image src={logoUrl} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Reporte de mantenimientos</Text>
            <Text style={s.headerLine}>
              Del {formatDate(from)} al {formatDate(to)}
            </Text>
            <Text style={s.headerLine}>{kindLabel}</Text>
          </View>
        </View>

        <View style={s.banner}>
          <Text style={s.bannerText}>Evidencia de mantenimiento de equipo de cómputo</Text>
        </View>

        <View style={s.summary}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Total</Text>
            <Text style={s.cardValue}>{items.length}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Preventivos</Text>
            <Text style={s.cardValue}>{preventive}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Correctivos</Text>
            <Text style={s.cardValue}>{corrective}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Realizados</Text>
            <Text style={s.cardValue}>{done}</Text>
          </View>
        </View>

        {items.length === 0 ? (
          <Text style={s.empty}>No hay mantenimientos en el periodo elegido.</Text>
        ) : (
          items.map((m) => {
            const equipo = m.laptop ?? m.phone;
            const fotos = (m.photos ?? []).slice(0, maxPhotos);
            return (
              <View key={m.id} style={s.item} wrap={false}>
                <View style={s.itemHead}>
                  <Text style={s.itemTitle}>{equipo?.name ?? "Equipo dado de baja"}</Text>
                  <Text style={s.itemTag}>
                    {MAINTENANCE_KIND_LABELS[m.kind]} · {MAINTENANCE_STATUS_LABELS[m.status]}
                  </Text>
                </View>
                <View style={s.itemBody}>
                  <View style={s.row}>
                    <Text style={s.label}>Programado</Text>
                    <Text style={s.value}>{formatDate(m.scheduledFor)}</Text>
                  </View>
                  <View style={s.row}>
                    <Text style={s.label}>Realizado</Text>
                    <Text style={s.value}>{formatDate(m.performedAt)}</Text>
                  </View>
                  <View style={s.row}>
                    <Text style={s.label}>Responsable</Text>
                    <Text style={s.value}>{m.technician.name}</Text>
                  </View>
                  {equipo?.serialNumber ? (
                    <View style={s.row}>
                      <Text style={s.label}>Serie</Text>
                      <Text style={s.value}>{equipo.serialNumber}</Text>
                    </View>
                  ) : null}
                  {equipo?.assignedTo?.name ? (
                    <View style={s.row}>
                      <Text style={s.label}>Usuario</Text>
                      <Text style={s.value}>{equipo.assignedTo.name}</Text>
                    </View>
                  ) : null}
                  <View style={s.row}>
                    <Text style={s.label}>Trabajo</Text>
                    <Text style={s.value}>{m.description}</Text>
                  </View>

                  {m.findings ? (
                    <View style={s.findings}>
                      <Text style={s.findingsLabel}>Hallazgos y trabajo realizado</Text>
                      <Text style={{ fontSize: 8.5 }}>{m.findings}</Text>
                    </View>
                  ) : null}

                  {fotos.length > 0 ? (
                    <View style={s.photos}>
                      {fotos.map((p, i) => (
                        <Image key={i} src={thumb(p.url)} style={s.photo} />
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 10 }}>
          Generado por {generatedBy} el {generated}.
        </Text>
      </Page>
    </Document>
  );
}
