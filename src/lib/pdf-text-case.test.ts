import { describe, it, expect } from "vitest";
import { pdfSentence, pdfTitle, sentenceCaseSegments } from "@/lib/pdf-text-case";

describe("nombres en el PDF", () => {
  it("baja lo capturado en mayúsculas", () => {
    expect(pdfTitle("LAURA NUÑEZ")).toBe("Laura Nuñez");
  });

  it("sube lo capturado en minúsculas", () => {
    expect(pdfTitle("quesos navarro")).toBe("Quesos Navarro");
  });

  it("respeta lo que ya estaba bien escrito", () => {
    expect(pdfTitle("Mauricio Jiménez")).toBe("Mauricio Jiménez");
    expect(pdfTitle("McAllen Freight")).toBe("McAllen Freight");
  });

  it("las partículas van en minúscula, salvo al inicio", () => {
    expect(pdfTitle("MARIA DE LA LUZ")).toBe("Maria de la Luz");
    expect(pdfTitle("DE LA ROSA TRANSPORTES")).toBe("De la Rosa Transportes");
  });

  it("la razón social conserva sus siglas", () => {
    expect(pdfTitle("TRANSPORTES DEL NORTE S.A. DE C.V.")).toBe("Transportes del Norte S.A. de C.V.");
    expect(pdfTitle("fletes sa de cv")).toBe("Fletes SA de CV");
  });

  it("vacío se queda vacío", () => {
    expect(pdfTitle(null)).toBe("");
    expect(pdfTitle("   ")).toBe("");
  });
});

describe("texto libre en el PDF", () => {
  it("pone formato oración", () => {
    expect(pdfSentence("NISSA REFRIGERADA")).toBe("Nissa refrigerada");
    expect(pdfSentence("plataforma de 45'")).toBe("Plataforma de 45'");
  });

  it("respeta lo que ya estaba bien escrito", () => {
    expect(pdfSentence("Caja seca")).toBe("Caja seca");
  });

  it("las siglas siguen en mayúsculas", () => {
    expect(pdfSentence("**TARIFAS NO INCLUYEN IVA")).toBe("**Tarifas no incluyen IVA");
    expect(pdfSentence("responsable de rrhh")).toBe("Responsable de RRHH");
  });

  it("empieza frase nueva tras el punto", () => {
    expect(pdfSentence("PRECIOS EN MXN. EL PAGO ES A 30 DÍAS.")).toBe("Precios en MXN. El pago es a 30 días.");
  });

  it("un punto de abreviatura no empieza frase", () => {
    expect(pdfSentence("FACTURA A NOMBRE DE JTP S.A. DE C.V. SIN EXCEPCIÓN")).toBe(
      "Factura a nombre de JTP S.A. de C.V. sin excepción"
    );
  });

  it("un número al inicio no pone mayúscula a lo que sigue", () => {
    expect(pdfSentence("45 TONELADAS MÁXIMO")).toBe("45 toneladas máximo");
    expect(pdfSentence("1. EL CLIENTE PAGA")).toBe("1. El cliente paga");
  });

  it("no toca correos ni direcciones web, ni cuentan al decidir", () => {
    expect(pdfSentence("ENVIAR A privacidad@jtp.com.mx. GRACIAS")).toBe(
      "Enviar a privacidad@jtp.com.mx. Gracias"
    );
  });
});

describe("términos partidos en pedazos por el formato", () => {
  it("decide la mayúscula sobre la frase completa, no por pedazo", () => {
    // "NO INCLUYEN" en negritas: el editor lo guarda como otro pedazo.
    expect(sentenceCaseSegments(["TARIFAS ", "NO INCLUYEN", " IVA."])).toEqual([
      "Tarifas ",
      "no incluyen",
      " IVA.",
    ]);
  });

  it("si el párrafo ya mezcla mayúsculas y minúsculas, lo deja igual", () => {
    const parts = ["Tarifas ", "NO", " incluyen IVA"];
    expect(sentenceCaseSegments(parts)).toEqual(parts);
  });

  it("un salto de línea empieza frase", () => {
    expect(sentenceCaseSegments(["PRIMERA LÍNEA", "\n", "SEGUNDA"])).toEqual([
      "Primera línea",
      "\n",
      "Segunda",
    ]);
  });
});
