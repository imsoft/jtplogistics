import { describe, it, expect } from "vitest";
import type { TimeClockEntry } from "@prisma/client";
import { effectiveMarks } from "@/lib/time-clock-corrections";

const BASE = {
  userId: "u1",
  workDate: new Date("2026-09-10T00:00:00Z"),
  ipAddress: null,
  userAgent: null,
  deviceId: null,
  latitude: null,
  longitude: null,
  accuracyM: null,
  distanceM: null,
  geoStatus: null,
  reason: null,
  outsideGeofence: null,
  foreignNetwork: null,
  sharedDevice: null,
  correctionKind: null,
  correctionOfId: null,
  correctedById: null,
  correctionReason: null,
} as const;

function entry(over: Partial<TimeClockEntry> & { id: string }): TimeClockEntry {
  return {
    ...BASE,
    mark: "clock_in",
    markedAt: new Date("2026-09-10T15:00:00Z"),
    createdAt: new Date("2026-09-10T15:00:00Z"),
    ...over,
  } as TimeClockEntry;
}

describe("marcas efectivas", () => {
  it("sin correcciones, las originales pasan tal cual", () => {
    const out = effectiveMarks([entry({ id: "a" })]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
  });

  it("una anulación hace desaparecer la marca", () => {
    const out = effectiveMarks([
      entry({ id: "a" }),
      entry({ id: "c", correctionKind: "void", correctionOfId: "a" }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("un ajuste cambia la hora pero conserva la marca original", () => {
    const out = effectiveMarks([
      entry({ id: "a", markedAt: new Date("2026-09-10T15:40:00Z") }),
      entry({
        id: "c",
        correctionKind: "adjust",
        correctionOfId: "a",
        markedAt: new Date("2026-09-10T15:00:00Z"),
      }),
    ]);
    expect(out).toHaveLength(1);
    // Conserva el id de la original: la corrección no la reemplaza, la ajusta.
    expect(out[0].id).toBe("a");
    expect(out[0].markedAt.toISOString()).toBe("2026-09-10T15:00:00.000Z");
  });

  it("una marca agregada entra aunque nadie la haya marcado", () => {
    const out = effectiveMarks([
      entry({ id: "a" }),
      entry({
        id: "c",
        mark: "clock_out",
        correctionKind: "add",
        markedAt: new Date("2026-09-11T00:00:00Z"),
      }),
    ]);
    expect(out.map((e) => e.mark)).toEqual(["clock_in", "clock_out"]);
  });

  it("si hay dos correcciones sobre la misma marca, manda la última", () => {
    const out = effectiveMarks([
      entry({ id: "a", markedAt: new Date("2026-09-10T15:40:00Z") }),
      entry({
        id: "c1",
        correctionKind: "adjust",
        correctionOfId: "a",
        markedAt: new Date("2026-09-10T15:20:00Z"),
        createdAt: new Date("2026-09-10T18:00:00Z"),
      }),
      entry({
        id: "c2",
        correctionKind: "adjust",
        correctionOfId: "a",
        markedAt: new Date("2026-09-10T15:00:00Z"),
        createdAt: new Date("2026-09-10T19:00:00Z"),
      }),
    ]);
    expect(out[0].markedAt.toISOString()).toBe("2026-09-10T15:00:00.000Z");
  });

  it("devuelve las marcas en orden de reloj", () => {
    const out = effectiveMarks([
      entry({ id: "b", mark: "clock_out", markedAt: new Date("2026-09-11T00:00:00Z") }),
      entry({ id: "a", mark: "clock_in", markedAt: new Date("2026-09-10T15:00:00Z") }),
    ]);
    expect(out.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
