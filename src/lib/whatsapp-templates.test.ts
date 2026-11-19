import { describe, expect, it } from "vitest";
import {
  WHATSAPP_TEMPLATES,
  explainWhatsAppError,
  fillTemplate,
  missingParams,
  templateByName,
  templateCreateBody,
  templateMessage,
  textMessage,
  whatsappNumber,
} from "./whatsapp-templates";

describe("plantillas de WhatsApp", () => {
  it("números con lada de México", () => {
    expect(whatsappNumber("33-3410-9866")).toBe("523334109866");
    expect(whatsappNumber("+52 1 33 3410 9866")).toBe("5213334109866");
    expect(whatsappNumber("+1 (555) 142-2920")).toBe("15551422920");
    expect(whatsappNumber("123")).toBeNull();
  });

  it("vista previa y variables faltantes", () => {
    const t = templateByName("jtp_seguimiento_embarque")!;
    expect(fillTemplate(t.body, ["Omnigreen", "J-1", "", "en ruta"])).toBe(
      "HOLA, OMNIGREEN. TU EMBARQUE J-1 ({{3}}) TIENE UNA ACTUALIZACIÓN: EN RUTA. TE AVISAREMOS DE CADA CAMBIO. JTP LOGISTICS."
    );
    expect(missingParams(t, ["a", "b", "", "d"])).toEqual(["Ruta"]);
  });

  it("mensaje de plantilla con sus variables", () => {
    const t = templateByName("jtp_embarque_entregado")!;
    const m = templateMessage("523334109866", t, ["omnigreen", "j-1", "orizaba"]);
    expect(m.template.language.code).toBe("es_MX");
    expect(m.template.components?.[0].parameters.map((p) => p.text)).toEqual(["OMNIGREEN", "J-1", "ORIZABA"]);
    expect(templateMessage("1", templateByName("hello_world")!, []).template.components).toBeUndefined();
    expect(textMessage("1", "hola").type).toBe("text");
  });

  it("las de JTP se registran con ejemplo; la de Meta no", () => {
    for (const t of WHATSAPP_TEMPLATES.filter((x) => !x.builtIn)) {
      const vars = t.body.match(/\{\{\d+\}\}/g) ?? [];
      expect(vars.length, t.name).toBe(t.params.length);
      expect(t.example.length, t.name).toBe(t.params.length);
      expect(t.name).toMatch(/^[a-z0-9_]+$/);
      expect(templateCreateBody(t).components[0].example?.body_text[0]).toEqual(t.example);
    }
  });

  it("errores de Meta en español", () => {
    expect(explainWhatsAppError(131030, "x")).toMatch(/lista de números de prueba/);
    expect(explainWhatsAppError(999, "otro")).toBe("otro");
  });
});
