import { describe, it, expect } from "vitest";
import { buildCelebrationEmail, firstName } from "@/lib/celebration-email";

const BASE = "https://www.jtplogistics.com";

describe("firstName", () => {
  it("toma el primer nombre y lo capitaliza", () => {
    expect(firstName("ana fabiola castro higadera")).toBe("Ana");
    expect(firstName("MARIO BRIAN RUIZ SALAZAR")).toBe("Mario");
  });
});

describe("buildCelebrationEmail", () => {
  it("arma el correo de cumpleaños con la edad", () => {
    const mail = buildCelebrationEmail({
      name: "lizbeth murrieta",
      kind: "birthday",
      years: 28,
      base: BASE,
    });

    expect(mail.subject).toBe("¡Feliz cumpleaños, Lizbeth! 🎂");
    expect(mail.html).toContain("¡Feliz cumpleaños, Lizbeth!");
    expect(mail.html).toContain("28 años");
    expect(mail.text).toContain("¡Feliz cumpleaños, Lizbeth!");
  });

  it("arma el correo de aniversario y singulariza un año", () => {
    const mail = buildCelebrationEmail({
      name: "David Illescas",
      kind: "anniversary",
      years: 1,
      base: BASE,
    });

    expect(mail.subject).toBe("¡Felicidades por tu 1 año en JTP, David! 🎉");
    expect(mail.html).toContain("1 año");
    expect(mail.html).not.toContain("1 años");
  });

  it("incluye el logo y el botón cuando hay URL base", () => {
    const mail = buildCelebrationEmail({
      name: "Ana",
      kind: "birthday",
      years: 30,
      base: BASE,
    });

    expect(mail.html).toContain(`${BASE}/images/logo/jtp-logistics.png`);
    expect(mail.html).toContain(`${BASE}/collaborator/dashboard/mural`);
  });

  it("respeta la ruta del mural según el rol", () => {
    const mail = buildCelebrationEmail({
      name: "Ana",
      kind: "birthday",
      years: 30,
      base: BASE,
      muralPath: "/admin/dashboard/mural",
    });

    expect(mail.html).toContain(`${BASE}/admin/dashboard/mural`);
  });

  it("sin URL base omite logo y botón, y usa el texto de respaldo", () => {
    const mail = buildCelebrationEmail({ name: "Ana", kind: "birthday", years: 30 });

    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("JTP LOGISTICS");
    expect(mail.html).not.toContain("Ver el mural");
  });

  it("funciona sin años registrados", () => {
    const mail = buildCelebrationEmail({ name: "Ana", kind: "anniversary", years: null, base: BASE });

    expect(mail.subject).toBe("¡Felicidades por tu aniversario en JTP, Ana! 🎉");
    expect(mail.html).toContain("Hoy celebramos tu aniversario");
  });

  it("escapa el HTML del nombre", () => {
    const mail = buildCelebrationEmail({
      name: "<script>alert(1)</script>",
      kind: "birthday",
      years: 30,
      base: BASE,
    });

    expect(mail.html).not.toContain("<script>");
  });
});
