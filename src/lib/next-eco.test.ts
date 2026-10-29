import { describe, expect, it } from "vitest";
import { nextEco } from "./next-eco";

describe("siguiente ECO", () => {
  it("el más alto más uno, en el formato de siempre", () => {
    expect(nextEco(["j - 16353", "ECO J - 18567", "j - 14705", null])).toBe("J - 18568");
    expect(nextEco(["J-099"])).toBe("J - 100");
    expect(nextEco([])).toBe("J - 1");
    expect(nextEco(["sin número"])).toBe("J - 1");
  });
});
