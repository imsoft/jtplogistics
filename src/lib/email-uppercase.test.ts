import { describe, it, expect } from "vitest";
import { uppercaseEmailHtml, uppercaseEmailText } from "@/lib/email-uppercase";

describe("uppercaseEmailText", () => {
  it("sube el texto", () => {
    expect(uppercaseEmailText("Hola Brandon")).toBe("HOLA BRANDON");
  });

  it("conserva los acentos", () => {
    expect(uppercaseEmailText("Cotización marítima")).toBe("COTIZACIÓN MARÍTIMA");
  });

  it("no toca las URLs", () => {
    expect(uppercaseEmailText("Entra en https://jtp.com.mx/reset?token=aBcD ahora")).toBe(
      "ENTRA EN https://jtp.com.mx/reset?token=aBcD AHORA"
    );
  });

  it("no toca las direcciones de correo", () => {
    expect(uppercaseEmailText("Escribe a software@jtp.com.mx hoy")).toBe(
      "ESCRIBE A software@jtp.com.mx HOY"
    );
  });
});

describe("uppercaseEmailHtml", () => {
  it("sube el texto y deja la etiqueta igual", () => {
    expect(uppercaseEmailHtml("<p>Hola mundo</p>")).toBe("<p>HOLA MUNDO</p>");
  });

  it("no toca los atributos ni el href", () => {
    expect(
      uppercaseEmailHtml('<a href="https://jtp.com.mx/login" style="color:#1447E6">Entrar</a>')
    ).toBe('<a href="https://jtp.com.mx/login" style="color:#1447E6">ENTRAR</a>');
  });

  it("no rompe las entidades", () => {
    expect(uppercaseEmailHtml("<p>Ruta &amp; destino</p>")).toBe("<p>RUTA &amp; DESTINO</p>");
  });

  it("respeta el correo dentro del texto visible", () => {
    expect(uppercaseEmailHtml("<p>Avisa a rh@jtp.com.mx</p>")).toBe(
      "<p>AVISA A rh@jtp.com.mx</p>"
    );
  });

  it("deja intacto el doctype y las etiquetas de estructura", () => {
    const html = '<!doctype html><html lang="es"><body><h1>Bienvenido</h1></body></html>';
    expect(uppercaseEmailHtml(html)).toBe(
      '<!doctype html><html lang="es"><body><h1>BIENVENIDO</h1></body></html>'
    );
  });
});
