import { describe, expect, it } from "vitest";
import { matchStatement, parseBankAmount, parseBankDate, parseCsv, parseStatementRows, type PlatformMovement } from "./bank-statement";

describe("lectura del estado de cuenta", () => {
  it("fechas en los formatos de los bancos", () => {
    expect(parseBankDate("15/10/2026")).toBe("2026-10-15");
    expect(parseBankDate("5-10-26")).toBe("2026-10-05");
    expect(parseBankDate("2026-10-15T00:00:00")).toBe("2026-10-15");
    expect(parseBankDate("15-OCT-2026")).toBe("2026-10-15");
    expect(parseBankDate("03/dic/2026")).toBe("2026-12-03");
    expect(parseBankDate(46310)).toBe("2026-10-15");
    expect(parseBankDate(new Date("2026-10-15T00:00:00Z"))).toBe("2026-10-15");
    expect(parseBankDate("Saldo inicial")).toBeNull();
    expect(parseBankDate("31/02/2026")).toBeNull();
  });

  it("importes con signo, paréntesis y símbolos", () => {
    expect(parseBankAmount("$1,234.56")).toBe(1234.56);
    expect(parseBankAmount("(1,234.56)")).toBe(-1234.56);
    expect(parseBankAmount("-500")).toBe(-500);
    expect(parseBankAmount("1.234,56")).toBe(1234.56);
    expect(parseBankAmount("")).toBeNull();
    expect(parseBankAmount(" - ")).toBeNull();
  });

  it("CSV con cargos y abonos (tipo BBVA), saltando encabezado y saldo inicial", () => {
    const csv = `﻿Estado de cuenta;;;;
Cuenta 0123;;;;
Fecha;Concepto;Referencia;Cargo;Abono
01/10/2026;SALDO INICIAL;;;
02/10/2026;"SPEI RECIBIDO ACEROS; FACT A-1";SPEI 123;;"1,120.00"
03/10/2026;COMISION SPEI;;5.80;
05/10/2026;PAGO TRANSPORTISTA;9988;40,000.00;`;
    const r = parseStatementRows(parseCsv(csv));
    if (!r.ok) throw new Error(r.error);
    expect(r.lines).toEqual([
      { date: "2026-10-02", amount: 1120, description: "SPEI RECIBIDO ACEROS; FACT A-1", reference: "SPEI 123" },
      { date: "2026-10-03", amount: -5.8, description: "COMISION SPEI", reference: null },
      { date: "2026-10-05", amount: -40000, description: "PAGO TRANSPORTISTA", reference: "9988" },
    ]);
  });

  it("una sola columna de importe con signo (tipo Banorte)", () => {
    const r = parseStatementRows([
      ["Fecha de operación", "Descripción", "Importe", "Saldo"],
      ["15-oct-2026", "DEPOSITO", "2,000.00", "12,000.00"],
      ["16-oct-2026", "RETIRO", "-300.00", "11,700.00"],
    ]);
    expect(r.ok && r.lines.map((l) => l.amount)).toEqual([2000, -300]);
  });

  it("sin columnas reconocibles", () => {
    expect(parseStatementRows([["a", "b"], ["1", "2"]])).toMatchObject({ ok: false });
  });
});

describe("empate contra la plataforma", () => {
  const mv = (id: string, date: string, amount: number, extra: Partial<PlatformMovement> = {}): PlatformMovement => ({ id, date, amount, concept: id, reference: null, reconciled: false, ...extra });

  it("mismo importe y fecha cercana; cada movimiento una vez", () => {
    const lines = [
      { date: "2026-10-02", amount: 1120, description: "SPEI", reference: null },
      { date: "2026-10-03", amount: -5.8, description: "COMISION", reference: null },
      { date: "2026-10-06", amount: 1120, description: "SPEI", reference: null },
      { date: "2026-10-20", amount: 500, description: "DEPOSITO", reference: null },
    ];
    const r = matchStatement(lines, [mv("a", "2026-10-01", 1120), mv("b", "2026-10-07", 1120), mv("c", "2026-10-10", -999), mv("d", "2026-10-25", 500)]);
    expect(r.matches).toEqual([
      { line: 0, movementId: "a", alreadyReconciled: false, dayGap: 1 },
      { line: 2, movementId: "b", alreadyReconciled: false, dayGap: 1 },
    ]);
    expect(r.unmatchedLines).toEqual([1, 3]);
    expect(r.unmatchedMovements).toEqual(["c"]);
  });

  it("la referencia desempata", () => {
    const r = matchStatement([{ date: "2026-10-02", amount: 100, description: "SPEI REF 777", reference: null }], [mv("x", "2026-10-02", 100, { reference: "555" }), mv("y", "2026-10-03", 100, { reference: "777" })]);
    expect(r.matches[0].movementId).toBe("y");
  });

  it("lo ya conciliado se reconoce y no se vuelve a proponer", () => {
    const r = matchStatement([{ date: "2026-10-02", amount: 100, description: "x", reference: null }], [mv("x", "2026-10-02", 100, { reconciled: true })]);
    expect(r.matches[0]).toMatchObject({ movementId: "x", alreadyReconciled: true });
    expect(r.unmatchedLines).toEqual([]);
  });
});
