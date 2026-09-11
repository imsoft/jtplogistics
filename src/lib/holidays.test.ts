import { describe, it, expect } from "vitest";
import { isInaugurationYear, mexicanStatutoryHolidays, nthWeekday } from "@/lib/holidays";

describe("lunes que marca la ley", () => {
  it("primer lunes de febrero de 2026 es el 2", () => {
    expect(nthWeekday(2026, 2, 1, 1)).toBe("2026-02-02");
  });

  it("tercer lunes de marzo de 2026 es el 16", () => {
    expect(nthWeekday(2026, 3, 1, 3)).toBe("2026-03-16");
  });

  it("tercer lunes de noviembre de 2026 es el 16", () => {
    expect(nthWeekday(2026, 11, 1, 3)).toBe("2026-11-16");
  });

  it("si el mes empieza en lunes, ese mismo día es el primero", () => {
    // Febrero de 2027 empieza en lunes.
    expect(nthWeekday(2027, 2, 1, 1)).toBe("2027-02-01");
  });
});

describe("días de descanso obligatorio", () => {
  it("un año normal tiene siete", () => {
    expect(mexicanStatutoryHolidays(2026)).toHaveLength(7);
  });

  it("incluye las fechas fijas", () => {
    const dates = mexicanStatutoryHolidays(2026).map((h) => h.date);
    expect(dates).toEqual(
      expect.arrayContaining(["2026-01-01", "2026-05-01", "2026-09-16", "2026-12-25"])
    );
  });

  it("el cambio de presidente agrega el 1 de octubre cada seis años", () => {
    expect(isInaugurationYear(2024)).toBe(true);
    expect(isInaugurationYear(2030)).toBe(true);
    expect(isInaugurationYear(2026)).toBe(false);
    expect(mexicanStatutoryHolidays(2030).map((h) => h.date)).toContain("2030-10-01");
    expect(mexicanStatutoryHolidays(2026).map((h) => h.date)).not.toContain("2026-10-01");
  });

  it("salen en orden de calendario", () => {
    const dates = mexicanStatutoryHolidays(2030).map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
