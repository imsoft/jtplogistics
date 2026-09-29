import { describe, it, expect } from "vitest";
import {
  ACCOUNT_RESPONSIBILITY_NOTICE,
  CHANGE_PASSWORD_HINT,
  buildCarrierMemberInviteEmail,
  buildPasswordResetByStaffEmail,
  buildPasswordResetEmail,
} from "@/lib/account-email";
import { uppercaseEmailHtml, uppercaseEmailText } from "@/lib/email-uppercase";

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

describe("invitación a un usuario del proveedor", () => {
  const invite = {
    name: "Laura Méndez",
    companyName: "Transportes del Norte",
    inviterName: "Mario Barajas",
    email: "laura@example.com",
    password: "JTP-K7M2NPQR",
    loginUrl: "https://www.jtplogistics.com/login",
    manualUrl: "https://www.jtplogistics.com/manual-proveedor",
  };

  it("lleva el enlace al manual, en HTML y en texto plano", () => {
    const built = buildCarrierMemberInviteEmail(invite);
    expect(built.html).toContain(`href="${invite.manualUrl}"`);
    expect(built.text).toContain(invite.manualUrl);
  });

  it("sigue llevando la contraseña y el aviso de responsabilidad", () => {
    const built = buildCarrierMemberInviteEmail(invite);
    expect(built.html).toContain(invite.password);
    expect(built.html).toContain(ACCOUNT_RESPONSIBILITY_NOTICE);
  });
});

describe("cómo cambiar la contraseña temporal", () => {
  const invite = {
    name: "Laura Méndez",
    companyName: "Transportes del Norte",
    inviterName: "Mario Barajas",
    email: "laura@example.com",
    password: "JTP-K7M2NPQR",
    loginUrl: "https://www.jtplogistics.com/login",
    manualUrl: "https://www.jtplogistics.com/manual-proveedor",
  };
  const correos = [
    ["restablecida por soporte", buildPasswordResetByStaffEmail(input)],
    ["invitación del proveedor", buildCarrierMemberInviteEmail(invite)],
  ] as const;

  // El perfil no tiene cambio de contraseña: mandar ahí deja a la persona sin salida.
  it.each(correos)("%s no manda a cambiarla desde el perfil", (_, built) => {
    expect(built.html).not.toMatch(/desde tu perfil/i);
    expect(built.text).not.toMatch(/desde tu perfil/i);
  });

  it.each(correos)("%s explica el camino que sí existe", (_, built) => {
    expect(built.html).toContain("¿Olvidaste tu contraseña?");
    expect(built.text).toContain(CHANGE_PASSWORD_HINT);
  });
});

describe("la contraseña llega tal cual se guardó", () => {
  // Así sale de sendEmail: todo el correo pasa a mayúsculas antes de enviarse.
  const mixta = "Jtp&Clave2026x";

  it("restablecida por soporte: igual en HTML y en texto", () => {
    const built = buildPasswordResetByStaffEmail({ ...input, password: mixta });
    expect(uppercaseEmailHtml(built.html)).toContain("Jtp&amp;Clave2026x");
    expect(uppercaseEmailText(built.text)).toContain(mixta);
  });

  it("invitación del proveedor: igual en HTML y en texto", () => {
    const built = buildCarrierMemberInviteEmail({
      name: "Laura Méndez",
      companyName: "Transportes del Norte",
      inviterName: "Mario Barajas",
      email: "laura@example.com",
      password: mixta,
      loginUrl: "https://www.jtplogistics.com/login",
      manualUrl: "https://www.jtplogistics.com/manual-proveedor",
    });
    expect(uppercaseEmailHtml(built.html)).toContain("Jtp&amp;Clave2026x");
    expect(uppercaseEmailText(built.text)).toContain(mixta);
  });

  it("el resto del correo sí va en mayúsculas", () => {
    const built = buildPasswordResetByStaffEmail({ ...input, password: mixta });
    expect(uppercaseEmailText(built.text)).toContain("CONTRASEÑA TEMPORAL:");
  });
});
