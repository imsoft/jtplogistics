import { describe, expect, it } from "vitest";
import { cleanGroupName, cleanMessageBody, directKey, initials, uniqueIds } from "./team-chat";

describe("chat entre colaboradores", () => {
  it("la conversación directa es la misma sin importar quién escribe primero", () => {
    expect(directKey("b", "a")).toBe("a:b");
    expect(directKey("a", "b")).toBe(directKey("b", "a"));
  });
  it("no deja mandar mensajes vacíos ni enormes", () => {
    expect(cleanMessageBody("  hola ")).toEqual({ body: "hola" });
    expect(cleanMessageBody("   ")).toHaveProperty("error");
    expect(cleanMessageBody("x".repeat(4001))).toHaveProperty("error");
  });
  it("valida el nombre del grupo", () => {
    expect(cleanGroupName("  Finanzas   y  pagos ")).toEqual({ name: "Finanzas y pagos" });
    expect(cleanGroupName("F")).toHaveProperty("error");
  });
  it("limpia la lista de ids e iniciales", () => {
    expect(uniqueIds(["a", "a", "", 3, "b"])).toEqual(["a", "b"]);
    expect(initials("Isabel Huerta Pérez")).toBe("IH");
  });
});
