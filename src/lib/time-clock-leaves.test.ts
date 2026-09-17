import { describe, it, expect } from "vitest";
import {
  coversDate,
  eachDateKey,
  isWorkingLeave,
  LEAVE_KINDS,
  rangesOverlap,
} from "@/lib/time-clock-leaves";

describe("qué tipo sigue siendo día de trabajo", () => {
  it("solo el home office", () => {
    expect(isWorkingLeave("home_office")).toBe(true);
    for (const k of LEAVE_KINDS.filter((k) => k.value !== "home_office")) {
      expect(isWorkingLeave(k.value)).toBe(false);
    }
  });
});

describe("traslape de periodos", () => {
  it("detecta uno dentro de otro", () => {
    expect(rangesOverlap("2026-09-01", "2026-09-30", "2026-09-10", "2026-09-12")).toBe(true);
  });

  it("detecta el empalme por un solo día", () => {
    expect(rangesOverlap("2026-09-01", "2026-09-10", "2026-09-10", "2026-09-20")).toBe(true);
  });

  it("días pegados pero sin encimarse no se traslapan", () => {
    expect(rangesOverlap("2026-09-01", "2026-09-09", "2026-09-10", "2026-09-20")).toBe(false);
  });
});

describe("días de un rango", () => {
  it("incluye el primero y el último", () => {
    expect(eachDateKey("2026-09-17", "2026-09-19")).toEqual([
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
    ]);
  });

  it("un solo día devuelve ese día", () => {
    expect(eachDateKey("2026-09-17", "2026-09-17")).toEqual(["2026-09-17"]);
  });

  it("cruza el cambio de mes sin saltarse días", () => {
    expect(eachDateKey("2026-09-29", "2026-10-02")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("un rango al revés no devuelve nada", () => {
    expect(eachDateKey("2026-09-19", "2026-09-17")).toEqual([]);
  });
});

describe("el periodo cubre un día", () => {
  it("los extremos cuentan", () => {
    expect(coversDate("2026-09-17", "2026-09-19", "2026-09-17")).toBe(true);
    expect(coversDate("2026-09-17", "2026-09-19", "2026-09-19")).toBe(true);
  });

  it("fuera del rango, no", () => {
    expect(coversDate("2026-09-17", "2026-09-19", "2026-09-20")).toBe(false);
  });
});
