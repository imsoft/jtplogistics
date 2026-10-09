import { describe, it, expect } from "vitest";
import {
  TIME_CLOCK_EXPORT_HEADERS,
  exportDate,
  exportPeriodLabel,
  timeClockExportFilename,
  timeClockExportRows,
  type ExportRow,
} from "@/lib/time-clock-export";

const mark = (at: string, extra: Partial<ExportRow["marks"]["clock_in"]> = {}) => ({
  at,
  distanceM: 20,
  geoStatus: "granted",
  outsideGeofence: false,
  foreignNetwork: false,
  sharedDevice: false,
  ...extra,
});

const row = (over: Partial<ExportRow> = {}): ExportRow => ({
  leave: null,
  workDate: "2026-10-09",
  userName: "Ana Castro",
  marks: {},
  reasons: [],
  flags: [],
  corrections: [],
  ...over,
});

describe("timeClockExportRows", () => {
  it("cada fila tiene una celda por encabezado", () => {
    const [out] = timeClockExportRows([row()]);
    expect(out).toHaveLength(TIME_CLOCK_EXPORT_HEADERS.length);
  });

  // 15:05:09Z son las 09:05:09 en Guadalajara: la hora va en la zona de la empresa.
  it("pone la hora al segundo, en la hora de la empresa", () => {
    const [out] = timeClockExportRows([row({ marks: { clock_in: mark("2026-10-09T15:05:09.000Z") } })]);
    expect(out[3]).toBe("09:05:09");
    expect(out[4]).toBe("");
  });

  it("anota retardos con sus minutos y las faltas", () => {
    const [out] = timeClockExportRows([
      row({ flags: [{ kind: "retardo", minutesLate: 14 }, { kind: "falta", minutesLate: null }] }),
    ]);
    expect(out[7]).toBe("RETARDO 14 MIN; FALTA");
  });

  it("lleva las señales de cada marca, como en pantalla", () => {
    const [out] = timeClockExportRows([
      row({
        marks: {
          clock_in: mark("2026-10-09T15:00:00.000Z", { geoStatus: "denied", distanceM: null }),
          clock_out: mark("2026-10-10T00:00:00.000Z", { outsideGeofence: true, distanceM: 900, foreignNetwork: true }),
        },
      }),
    ]);
    expect(out[8]).toBe("ENTRADA: SIN UBICACIÓN; SALIDA: A 900 M DE LA OFICINA, OTRA CONEXIÓN");
  });

  it("marca permiso y festivo en la columna del día", () => {
    const [out] = timeClockExportRows(
      [row({ leave: "home_office" })],
      new Map([["2026-10-09", "Día de prueba"]])
    );
    expect(out[2]).toContain("FESTIVO: DÍA DE PRUEBA");
    expect(out[2].split("; ")).toHaveLength(2);
  });

  it("deja constancia de las correcciones y sus motivos", () => {
    const [out] = timeClockExportRows([
      row({ reasons: ["Tráfico"], corrections: [{ kind: "adjust", reason: "Marcó tarde", by: "Octavio" }] }),
    ]);
    expect(out[9]).toBe("TRÁFICO");
    expect(out[10]).toBe("HORA CORREGIDA POR OCTAVIO: MARCÓ TARDE");
  });
});

describe("mayúsculas, como en pantalla", () => {
  // Los nombres están guardados en minúsculas; la pantalla los sube por estilo.
  it("sube el nombre y los encabezados", () => {
    const [out] = timeClockExportRows([row({ userName: "maribel ramírez" })]);
    expect(out[0]).toBe("MARIBEL RAMÍREZ");
    expect(TIME_CLOCK_EXPORT_HEADERS[0]).toBe("COLABORADOR");
  });
});

describe("fechas y nombre de archivo", () => {
  it("la fecha no se recorre de día", () => {
    expect(exportDate("2026-10-01")).toBe("01/10/2026");
  });

  it("describe el periodo", () => {
    expect(exportPeriodLabel("2026-10-09", "2026-10-09")).toBe("09/10/2026");
    expect(exportPeriodLabel("2026-10-01", "2026-10-09")).toBe("Del 01/10/2026 al 09/10/2026");
  });

  it("nombra el archivo con el rango", () => {
    expect(timeClockExportFilename("2026-10-01", "2026-10-09", "xlsx")).toBe(
      "registro-checador-2026-10-01_a_2026-10-09.xlsx"
    );
    expect(timeClockExportFilename("2026-10-09", "2026-10-09", "pdf")).toBe("registro-checador-2026-10-09.pdf");
  });
});
