import { describe, expect, it } from "vitest";
import { botIdMode, isBotProtectedPath } from "./bot-protection";

describe("protección contra bots", () => {
  it("modo: vigilar por omisión", () => {
    expect(botIdMode(undefined)).toBe("monitor");
    expect(botIdMode("ENFORCE")).toBe("enforce");
    expect(botIdMode("off")).toBe("off");
    expect(botIdMode("otro")).toBe("monitor");
  });

  it("solo las pantallas públicas", () => {
    expect(isBotProtectedPath("/api/auth/sign-in/email")).toBe(true);
    expect(isBotProtectedPath("/api/auth/request-password-reset")).toBe(true);
    expect(isBotProtectedPath("/api/auth/get-session")).toBe(false);
    expect(isBotProtectedPath("/api/auth/sign-out")).toBe(false);
  });
});
