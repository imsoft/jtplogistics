import { describe, it, expect } from "vitest";
import {
  allowedMarksAfter,
  companyDateKey,
  distanceInMeters,
  workDateFromKey,
  workDateKey,
} from "@/lib/time-clock";

describe("secuencia de marcas", () => {
  it("una jornada empieza siempre por la entrada", () => {
    expect(allowedMarksAfter(null)).toEqual(["clock_in"]);
  });

  it("deja irse sin comer: quien no sale a comer marca salida directo", () => {
    expect(allowedMarksAfter("clock_in")).toContain("clock_out");
  });

  it("deja cerrar la jornada aunque se haya olvidado el regreso de comida", () => {
    expect(allowedMarksAfter("lunch_start")).toContain("clock_out");
  });

  it("no se puede volver a entrar sin cerrar la jornada", () => {
    expect(allowedMarksAfter("clock_in")).not.toContain("clock_in");
  });

  it("después de la salida no queda nada por marcar", () => {
    expect(allowedMarksAfter("clock_out")).toEqual([]);
  });
});

describe("fecha de la jornada", () => {
  it("usa la zona de la empresa, no la del servidor", () => {
    // 06:00 UTC del 11 son las 00:00 del 11 en Ciudad de México (UTC-6).
    expect(companyDateKey(new Date("2026-09-11T06:00:00Z"))).toBe("2026-09-11");
    // Un minuto antes todavía es día 10 para la empresa.
    expect(companyDateKey(new Date("2026-09-11T05:59:00Z"))).toBe("2026-09-10");
  });

  it("la clave sobrevive el viaje de ida y vuelta sin recorrerse un día", () => {
    expect(workDateKey(workDateFromKey("2026-09-10"))).toBe("2026-09-10");
  });
});

describe("distancia a la oficina", () => {
  it("da cero en el mismo punto", () => {
    const p = { lat: 20.6736, lng: -103.344 };
    expect(distanceInMeters(p, p)).toBe(0);
  });

  it("mide en metros a escala de una cuadra", () => {
    // Un grado de latitud son ~111 km; 0.001° ≈ 111 m.
    const d = distanceInMeters(
      { lat: 20.6736, lng: -103.344 },
      { lat: 20.6746, lng: -103.344 }
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it("distingue una casa al otro lado de la ciudad", () => {
    const d = distanceInMeters(
      { lat: 20.6736, lng: -103.344 },
      { lat: 20.7214, lng: -103.3918 }
    );
    expect(d).toBeGreaterThan(5000);
  });
});
