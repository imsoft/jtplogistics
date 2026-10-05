import { describe, it, expect } from "vitest";
import { unlockRequestRecipients, unlockApprovalHref } from "@/lib/unlock-request-notify";
import { buildUnlockRequestEmail } from "@/lib/carrier-email";

const user = (role: string, canUpdateProviders = false, id = role) => ({
  id,
  name: id,
  email: `${id}@jtp.com.mx`,
  role,
  canUpdateProviders,
});

describe("a quién se le avisa de una solicitud de desbloqueo", () => {
  // Pasó en producción: pricing podía autorizar y no le llegaba el aviso.
  it("al colaborador que puede autorizar, además de dirección", () => {
    const out = unlockRequestRecipients(
      [user("admin"), user("collaborator", true, "pricing"), user("collaborator", false, "rh")],
      "c1"
    );
    expect(out.map((r) => r.id)).toEqual(["admin", "pricing"]);
  });

  it("a nadie de fuera del equipo, aunque traiga el permiso prendido", () => {
    expect(unlockRequestRecipients([user("carrier", true), user("vendor", true)], "c1")).toEqual([]);
  });

  it("cada quien llega a la ficha de su propio panel", () => {
    expect(unlockApprovalHref("admin", "c1")).toBe("/admin/dashboard/users/c1");
    expect(unlockApprovalHref("collaborator", "c1")).toBe("/collaborator/dashboard/providers/c1");
  });
});

describe("correo de solicitud de desbloqueo", () => {
  const built = buildUnlockRequestEmail({
    name: "Victor Barrios",
    carrierName: "R8 Transportes",
    requesterName: "Eduardo",
    routeLabel: "León → Querétaro",
    unitLabel: "Caja seca",
    href: "https://www.jtplogistics.com/collaborator/dashboard/providers/c1",
  });

  it("dice quién, qué ruta y lleva el enlace para autorizar", () => {
    for (const body of [built.html, built.text]) {
      expect(body).toContain("R8 Transportes");
      expect(body).toContain("León → Querétaro");
      expect(body).toContain("/collaborator/dashboard/providers/c1");
    }
    expect(built.subject).toContain("R8 Transportes");
  });
});
