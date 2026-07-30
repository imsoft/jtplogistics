import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  hasSecret,
  hasEncryptionKey,
  MissingEncryptionKeyError,
} from "@/lib/secret-vault";

const KEY = randomBytes(32).toString("base64");
let original: string | undefined;

beforeAll(() => {
  original = process.env.CREDENTIALS_ENCRYPTION_KEY;
  process.env.CREDENTIALS_ENCRYPTION_KEY = KEY;
});

afterAll(() => {
  if (original === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  else process.env.CREDENTIALS_ENCRYPTION_KEY = original;
});

describe("secret-vault", () => {
  it("cifra y descifra de vuelta al valor original", () => {
    const plain = "Ops@JTP2024";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted).toMatch(/^v1:/);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("soporta acentos, emoji y contraseñas largas", () => {
    for (const plain of ["contraseñá-ü", "clave 🔐 seg", "x".repeat(500)]) {
      expect(decryptSecret(encryptSecret(plain))).toBe(plain);
    }
  });

  it("produce un texto cifrado distinto cada vez (IV aleatorio)", () => {
    const a = encryptSecret("misma-clave");
    const b = encryptSecret("misma-clave");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("no vuelve a cifrar un valor ya cifrado", () => {
    const once = encryptSecret("clave");
    expect(encryptSecret(once)).toBe(once);
  });

  it("trata los vacíos como null", () => {
    expect(encryptSecret("")).toBeNull();
    expect(encryptSecret(null)).toBeNull();
    expect(encryptSecret(undefined)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });

  it("devuelve tal cual los valores que aún no están cifrados", () => {
    // Durante la migración conviven ambos formatos.
    expect(decryptSecret("Ops@JTP2024")).toBe("Ops@JTP2024");
    expect(isEncrypted("Ops@JTP2024")).toBe(false);
  });

  it("falla al descifrar si la llave es otra", () => {
    const encrypted = encryptSecret("secreto");
    const prev = process.env.CREDENTIALS_ENCRYPTION_KEY;
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(decryptSecret(encrypted)).toBeNull();
    process.env.CREDENTIALS_ENCRYPTION_KEY = prev;
  });

  it("detecta si el texto cifrado fue alterado", () => {
    const encrypted = encryptSecret("secreto")!;
    const parts = encrypted.split(":");
    const tampered = [parts[0], parts[1], parts[2], Buffer.from("otro").toString("base64")].join(":");
    expect(decryptSecret(tampered)).toBeNull();
  });

  it("exige una llave del tamaño correcto", () => {
    const prev = process.env.CREDENTIALS_ENCRYPTION_KEY;
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("corta").toString("base64");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
    process.env.CREDENTIALS_ENCRYPTION_KEY = prev;
  });

  it("avisa claramente cuando falta la llave", () => {
    const prev = process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(hasEncryptionKey()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(MissingEncryptionKeyError);
    process.env.CREDENTIALS_ENCRYPTION_KEY = prev;
  });

  it("hasSecret distingue vacío de con contenido", () => {
    expect(hasSecret("algo")).toBe(true);
    expect(hasSecret("   ")).toBe(false);
    expect(hasSecret(null)).toBe(false);
  });
});
