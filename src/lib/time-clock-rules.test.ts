import { describe, it, expect } from "vitest";
import {
  expiryFrom,
  faltasFromRetardos,
  isLunchTooLong,
  isRetardo,
  lunchMinutes,
  minutesLate,
  needsReason,
  standing,
} from "@/lib/time-clock-rules";

const NUEVE = 9 * 60; // 540
const DIEZ_NOCHE = 22 * 60; // 1320

describe("retardo en la entrada", () => {
  it("dentro de la tolerancia no es retardo", () => {
    expect(isRetardo(NUEVE, 9 * 60 + 10)).toBe(false);
  });

  it("un minuto después de la tolerancia ya lo es", () => {
    expect(isRetardo(NUEVE, 9 * 60 + 11)).toBe(true);
  });

  it("llegar temprano da minutos negativos", () => {
    expect(minutesLate(NUEVE, 8 * 60 + 50)).toBe(-10);
  });
});

describe("turno que cruza la medianoche", () => {
  it("marcar a las 00:05 con entrada a las 22:00 son 125 minutos tarde", () => {
    expect(minutesLate(DIEZ_NOCHE, 5)).toBe(125);
    expect(isRetardo(DIEZ_NOCHE, 5)).toBe(true);
  });

  it("llegar antes de un turno de noche no cuenta como retardo enorme", () => {
    // 21:55 con entrada a las 22:00: cinco minutos antes, no 1435 tarde.
    expect(minutesLate(DIEZ_NOCHE, 21 * 60 + 55)).toBe(-5);
    expect(isRetardo(DIEZ_NOCHE, 21 * 60 + 55)).toBe(false);
  });

  it("dentro de la tolerancia del turno de noche tampoco", () => {
    expect(isRetardo(DIEZ_NOCHE, 22 * 60 + 8)).toBe(false);
  });
});

describe("hora de comida", () => {
  const salida = new Date("2026-09-10T20:00:00Z");

  it("una hora exacta está bien", () => {
    expect(isLunchTooLong(lunchMinutes(salida, new Date("2026-09-10T21:00:00Z")))).toBe(false);
  });

  it("los diez minutos de tolerancia alcanzan", () => {
    expect(isLunchTooLong(lunchMinutes(salida, new Date("2026-09-10T21:10:00Z")))).toBe(false);
  });

  it("pasando el minuto 70 hay que dar motivo", () => {
    expect(isLunchTooLong(lunchMinutes(salida, new Date("2026-09-10T21:11:00Z")))).toBe(true);
  });
});

describe("cuándo se exige el motivo", () => {
  it("al llegar tarde", () => {
    expect(needsReason({ mark: "clock_in", scheduledStart: NUEVE, markedMinute: 9 * 60 + 25 })).toBe(true);
  });

  it("no se le exige a quien llegó a tiempo", () => {
    expect(needsReason({ mark: "clock_in", scheduledStart: NUEVE, markedMinute: 9 * 60 + 2 })).toBe(false);
  });

  it("sin horario capturado no se le exige nada", () => {
    // RH todavía no le pone horario: no hay contra qué compararlo.
    expect(needsReason({ mark: "clock_in", scheduledStart: null, markedMinute: 13 * 60 })).toBe(false);
  });

  it("al regresar tarde de comer", () => {
    expect(
      needsReason({
        mark: "lunch_end",
        scheduledStart: NUEVE,
        markedMinute: 15 * 60,
        lunchStartedAt: new Date("2026-09-10T20:00:00Z"),
        markedAt: new Date("2026-09-10T21:30:00Z"),
      })
    ).toBe(true);
  });

  it("la salida nunca pide motivo", () => {
    expect(needsReason({ mark: "clock_out", scheduledStart: NUEVE, markedMinute: 23 * 60 })).toBe(false);
  });
});

describe("retardos que se vuelven falta", () => {
  it("dos retardos todavía no son nada", () => {
    expect(faltasFromRetardos(2)).toBe(0);
  });

  it("tres retardos hacen una falta", () => {
    expect(faltasFromRetardos(3)).toBe(1);
  });

  it("el cuarto retardo no dispara otra falta: los tres primeros se consumieron", () => {
    // Si no se consumieran, aquí saldrían 2 faltas de 4 retardos.
    expect(faltasFromRetardos(4)).toBe(1);
  });

  it("seis retardos sí son dos faltas", () => {
    expect(faltasFromRetardos(6)).toBe(2);
  });
});

describe("prospecto a baja", () => {
  it("dos faltas todavía no", () => {
    expect(standing({ retardosLibres: 0, faltas: 2 }).isProspecto).toBe(false);
  });

  it("tres faltas sí", () => {
    expect(standing({ retardosLibres: 0, faltas: 3 }).isProspecto).toBe(true);
  });

  it("nueve retardos llevan a prospecto sin faltar un día", () => {
    // La consecuencia encadenada que el cliente verificó y aprobó.
    expect(faltasFromRetardos(9)).toBe(3);
    expect(standing({ retardosLibres: 0, faltas: 3 }).isProspecto).toBe(true);
  });
});

describe("caducidad", () => {
  it("vive 30 días desde la jornada que la originó", () => {
    expect(expiryFrom(new Date("2026-09-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-10");
  });
});
