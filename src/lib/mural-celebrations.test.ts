import { describe, it, expect } from "vitest";
import { celebrationsInRange, celebrationDateInYear, type CelebrationPerson } from "@/lib/mural-celebrations";

function person(overrides: Partial<CelebrationPerson> = {}): CelebrationPerson {
  return {
    id: "u1",
    name: "Ana",
    image: null,
    position: null,
    birthDate: null,
    hireDate: null,
    ...overrides,
  };
}

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("celebrationDateInYear", () => {
  it("mantiene el mismo día y mes", () => {
    expect(celebrationDateInYear(utc(1990, 8, 14), 2026)).toEqual(utc(2026, 8, 14));
  });

  it("mueve el 29 de febrero al 28 en años no bisiestos", () => {
    expect(celebrationDateInYear(utc(1992, 2, 29), 2026)).toEqual(utc(2026, 2, 28));
    expect(celebrationDateInYear(utc(1992, 2, 29), 2028)).toEqual(utc(2028, 2, 29));
  });
});

describe("celebrationsInRange", () => {
  it("incluye cumpleaños y aniversarios dentro del rango", () => {
    const people = [
      person({ id: "u1", name: "Ana", birthDate: utc(1990, 8, 14) }),
      person({ id: "u2", name: "Luis", hireDate: utc(2020, 8, 20) }),
    ];

    const result = celebrationsInRange(people, utc(2026, 8, 1), utc(2026, 8, 31));

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ kind: "birthday", name: "Ana", years: 36 });
    expect(result[1]).toMatchObject({ kind: "anniversary", name: "Luis", years: 6 });
  });

  it("excluye lo que cae fuera del rango", () => {
    const people = [person({ birthDate: utc(1990, 1, 5) })];
    expect(celebrationsInRange(people, utc(2026, 8, 1), utc(2026, 8, 31))).toEqual([]);
  });

  it("cubre rangos que cruzan el fin de año", () => {
    const people = [
      person({ id: "u1", name: "Ana", birthDate: utc(1990, 12, 28) }),
      person({ id: "u2", name: "Luis", birthDate: utc(1988, 1, 3) }),
    ];

    const result = celebrationsInRange(people, utc(2026, 12, 20), utc(2027, 1, 10));

    expect(result.map((c) => c.name)).toEqual(["Ana", "Luis"]);
  });

  it("no cuenta años cuando el aniversario es el año de ingreso", () => {
    const people = [person({ hireDate: utc(2026, 8, 14) })];
    const result = celebrationsInRange(people, utc(2026, 8, 1), utc(2026, 8, 31));
    expect(result[0].years).toBeNull();
  });

  it("ignora a quien no tiene fechas registradas", () => {
    expect(celebrationsInRange([person()], utc(2026, 1, 1), utc(2026, 12, 31))).toEqual([]);
  });

  it("devuelve vacío si el rango está invertido", () => {
    const people = [person({ birthDate: utc(1990, 8, 14) })];
    expect(celebrationsInRange(people, utc(2026, 8, 31), utc(2026, 8, 1))).toEqual([]);
  });
});
