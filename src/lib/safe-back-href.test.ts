import { describe, expect, it } from "vitest";
import { safeBackHref } from "./safe-back-href";

describe("safeBackHref", () => {
  it("solo rutas internas", () => {
    expect(safeBackHref("%2Fadmin%2Fdashboard%2Fproviders%3Fq%3Dx", "/x")).toBe("/admin/dashboard/providers?q=x");
    expect(safeBackHref("https://evil.com", "/x")).toBe("/x");
    expect(safeBackHref("//evil.com", "/x")).toBe("/x");
    expect(safeBackHref("/\\evil.com", "/x")).toBe("/x");
    expect(safeBackHref("%E0%A4%A", "/x")).toBe("/x");
    expect(safeBackHref(null, "/x")).toBe("/x");
  });
});
