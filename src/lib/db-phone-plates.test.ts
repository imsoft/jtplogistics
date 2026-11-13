import { describe, expect, it } from "vitest";
import { fixWriteArgs } from "./db-phone-plates";

describe("teléfonos y placas al guardar", () => {
  it("embarque: celular, tracto y caja", () => {
    const a = fixWriteArgs("Shipment", "create", { data: { phone: "3334109866", truck: "02az1a", trailer: "", eco: "123" } });
    expect(a.data).toEqual({ phone: "33-3410-9866", truck: "02-AZ-1A", trailer: "", eco: "123" });
  });

  it("update con { set } y upsert", () => {
    expect(fixWriteArgs("Client", "update", { where: { id: "x" }, data: { phone: { set: "3334109866" } } }).data).toEqual({
      phone: { set: "33-3410-9866" },
    });
    const u = fixWriteArgs("CarrierVehicle", "upsert", { where: {}, create: { plates: "JKL1234" }, update: { plates: "JKL1234" } });
    expect(u.create).toEqual({ plates: "JK-L1-234" });
    expect(u.update).toEqual({ plates: "JK-L1-234" });
  });

  it("contactos anidados del perfil: solo los teléfonos", () => {
    const a = fixWriteArgs("Profile", "update", {
      data: { contacts: { deleteMany: {}, create: [{ type: "phone", value: "3334109866" }, { type: "email", value: "a@b.mx" }] } },
    });
    expect((a.data as { contacts: { create: unknown[] } }).contacts.create).toEqual([
      { type: "phone", value: "33-3410-9866" },
      { type: "email", value: "a@b.mx" },
    ]);
  });

  it("perfil creado junto con el usuario", () => {
    const a = fixWriteArgs("User", "create", {
      data: { name: "x", profile: { create: { contacts: { create: [{ type: "phone", value: "523334109866" }] } } } },
    });
    const create = (a.data as { profile: { create: { contacts: { create: { value: string }[] } } } }).profile.create;
    expect(create.contacts.create[0].value).toBe("+52-33-3410-9866");
  });

  it("no toca lecturas ni otros modelos", () => {
    const args = { where: { phone: "3334109866" } };
    expect(fixWriteArgs("Client", "findMany", args)).toBe(args);
    expect(fixWriteArgs("Route", "create", { data: { phone: "3334109866" } }).data).toEqual({ phone: "3334109866" });
  });
});
