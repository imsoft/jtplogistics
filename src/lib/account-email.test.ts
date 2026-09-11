import { describe, it, expect } from "vitest";
import {
  ACCOUNT_RESPONSIBILITY_NOTICE,
  buildPasswordResetByStaffEmail,
  buildPasswordResetEmail,
} from "@/lib/account-email";

const input = {
  name: "Mario Barajas",
  password: "JTP-K7M2NPQR",
  actorName: "Octavio Tirado",
  loginUrl: "https://www.jtplogistics.com/login",
};

describe("aviso de responsabilidad en el correo de accesos", () => {
  it("va en el pie del correo con la contraseña", () => {
    const { html } = buildPasswordResetByStaffEmail(input);
    expect(html).toContain(ACCOUNT_RESPONSIBILITY_NOTICE);
    // En el pie, no en el cuerpo: después de la línea divisoria.
    expect(html.indexOf(ACCOUNT_RESPONSIBILITY_NOTICE)).toBeGreaterThan(html.indexOf("border-top"));
  });

  it("también en la versión de texto plano", () => {
    expect(buildPasswordResetByStaffEmail(input).text).toContain(ACCOUNT_RESPONSIBILITY_NOTICE);
  });

  it("conserva el tono formal que pidió el cliente", () => {
    expect(ACCOUNT_RESPONSIBILITY_NOTICE).not.toMatch(/\btú\b|\beres\b/i);
  });

  it("no aparece en los correos que no son de accesos", () => {
    const { html } = buildPasswordResetEmail({ name: "Mario", url: "https://x.test" });
    expect(html).not.toContain(ACCOUNT_RESPONSIBILITY_NOTICE);
  });
});
