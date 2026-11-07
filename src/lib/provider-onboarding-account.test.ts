import { describe, it, expect } from "vitest";
import {
  PASSWORD_CHANGE_WINDOW_MS,
  isValidOnboardingEmail,
  isValidRfc,
  normalizeOnboardingEmail,
  normalizeRfc,
  passwordRecentlyChanged,
  providerProfileHref,
  shouldCreateProviderAccount,
  validateOnboardingContact,
} from "@/lib/provider-onboarding-account";
import { buildProviderWelcomeEmail } from "@/lib/account-email";
import { uppercaseEmailText } from "@/lib/email-uppercase";
import { ONBOARDING_DOCS, type DocRecord } from "@/lib/provider-onboardings";

const allDocs = (status: "pending" | "received" | "not_applicable") =>
  Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, status])) as DocRecord;

describe("correo y RFC del alta", () => {
  it("normaliza el correo a minúsculas y sin espacios", () => {
    expect(normalizeOnboardingEmail("  Ventas@Fletes.MX ")).toBe("ventas@fletes.mx");
    expect(normalizeOnboardingEmail("   ")).toBeNull();
  });

  it("normaliza el RFC a mayúsculas, sin espacios ni guiones", () => {
    expect(normalizeRfc(" abc-120101 ab1 ")).toBe("ABC120101AB1");
    expect(normalizeRfc("")).toBeNull();
  });

  it("valida el formato del correo", () => {
    expect(isValidOnboardingEmail("a@b.mx")).toBe(true);
    expect(isValidOnboardingEmail("sin-arroba.mx")).toBe(false);
  });

  it("acepta RFC de 12 y 13 caracteres, con & y Ñ", () => {
    expect(isValidRfc("ABC120101AB1")).toBe(true);
    expect(isValidRfc("GOMJ800101AB1")).toBe(true);
    expect(isValidRfc("Ñ&C120101AB1")).toBe(true);
    expect(isValidRfc("ABC12010AB1")).toBe(false);
    expect(isValidRfc("GOMJ800101AB12")).toBe(false);
    expect(isValidRfc("GOMJ80010.AB1")).toBe(false);
  });

  it("los dos son opcionales, pero si vienen deben ser válidos", () => {
    expect(validateOnboardingContact({ email: null, rfc: null })).toBeNull();
    expect(validateOnboardingContact({ email: "x", rfc: null })).toMatch(/correo/i);
    expect(validateOnboardingContact({ email: null, rfc: "ABC" })).toMatch(/RFC/);
  });
});

describe("cuándo se crea la cuenta del proveedor", () => {
  const base = { docs: allDocs("received"), email: "a@b.mx", rfc: "ABC120101AB1", userId: null };

  it("con el expediente completo, correo y RFC, y sin cuenta", () => {
    expect(shouldCreateProviderAccount(base)).toBe(true);
    // "No aplica" también resuelve el documento.
    expect(shouldCreateProviderAccount({ ...base, docs: allDocs("not_applicable") })).toBe(true);
  });

  it("no con algún documento pendiente", () => {
    expect(shouldCreateProviderAccount({ ...base, docs: { ...allDocs("received"), docIne: "pending" } })).toBe(false);
  });

  it("no sin correo o sin RFC válidos", () => {
    expect(shouldCreateProviderAccount({ ...base, email: null })).toBe(false);
    expect(shouldCreateProviderAccount({ ...base, rfc: null })).toBe(false);
    expect(shouldCreateProviderAccount({ ...base, rfc: "CORTO" })).toBe(false);
  });

  it("no si ya tiene cuenta", () => {
    expect(shouldCreateProviderAccount({ ...base, userId: "u1" })).toBe(false);
  });
});

describe("enlace al perfil del proveedor", () => {
  it("usa la pantalla de cada panel", () => {
    expect(providerProfileHref("admin", "u1")).toBe("/admin/dashboard/users/u1");
    expect(providerProfileHref("collaborator", "u1")).toBe("/collaborator/dashboard/providers/u1");
  });
});

describe("quitar el cambio obligatorio de contraseña", () => {
  const created = new Date("2026-11-06T10:00:00Z");
  const now = new Date("2026-11-06T12:00:00Z");

  it("solo si la credencial cambió hace poco", () => {
    expect(passwordRecentlyChanged({ createdAt: created, updatedAt: new Date(now.getTime() - 60_000) }, now)).toBe(true);
  });

  it("no si nunca cambió desde que se creó", () => {
    expect(passwordRecentlyChanged({ createdAt: created, updatedAt: created }, new Date(created.getTime() + 60_000))).toBe(false);
  });

  it("no si el cambio fue hace mucho", () => {
    const old = new Date(now.getTime() - PASSWORD_CHANGE_WINDOW_MS - 1000);
    expect(passwordRecentlyChanged({ createdAt: created, updatedAt: old }, now)).toBe(false);
  });
});

describe("correo de bienvenida del proveedor", () => {
  const built = buildProviderWelcomeEmail({
    companyName: "Fletes del Norte",
    email: "ventas@fletes.mx",
    rfc: "ABC120101AB1",
    loginUrl: "https://www.jtplogistics.com/login",
    manualUrl: "https://www.jtplogistics.com/manual-proveedor",
  });

  it("lleva el RFC como contraseña temporal, la liga de acceso y el aviso de cambio", () => {
    const text = uppercaseEmailText(built.text);
    expect(text).toContain("ABC120101AB1");
    expect(text).toContain("https://www.jtplogistics.com/login");
    expect(built.text).toMatch(/cambiar la contraseña/);
    expect(built.html).toContain("https://www.jtplogistics.com/login");
  });
});
