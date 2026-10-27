import { describe, expect, it } from "vitest";
import { maritimeMonthPrefix, nextMaritimeReference } from "./maritime-reference";

describe("folio de cotización marítima", () => {
  it("sigue al mayor folio del mes aunque se hayan borrado", () => {
    expect(nextMaritimeReference(["202610-02", "202610-05", "202609-09", "X"], "202610")).toBe("202610-06");
    expect(nextMaritimeReference([], "202611")).toBe("202611-01");
  });
  it("el mes es el de México: el 31 a las 20:00 todavía es octubre", () => {
    expect(maritimeMonthPrefix(new Date("2026-11-01T02:00:00Z"))).toBe("202610");
  });
});
