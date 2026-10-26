import { failure, requireBilling } from "@/lib/billing-server";
import { isDateKey } from "@/lib/billing-reports";
import { cashFlowReport, monthlyExport, statementReport } from "@/lib/billing-reports-server";

/**
 * GET /api/billing/reports?type=statement|cash-flow|export&from=&to=
 * El estado de cuenta pide además kind=receivable|payable y party=<razón social>.
 */
export async function GET(request: Request) {
  try {
    await requireBilling("view");
    const sp = new URL(request.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    if (!isDateKey(from) || !isDateKey(to)) return Response.json({ error: "Elige el periodo." }, { status: 400 });
    if (from > to) return Response.json({ error: "La fecha inicial no puede ser posterior a la final." }, { status: 400 });

    switch (sp.get("type")) {
      case "statement": {
        const kind = sp.get("kind") === "payable" ? "payable" : "receivable";
        const party = (sp.get("party") ?? "").trim();
        if (!party) return Response.json({ error: `Elige el ${kind === "receivable" ? "cliente" : "proveedor"}.` }, { status: 400 });
        return Response.json(await statementReport(kind, party, from, to));
      }
      case "cash-flow":
        return Response.json(await cashFlowReport(from, to));
      case "export":
        return Response.json(await monthlyExport(from, to));
      default:
        return Response.json({ error: "Reporte inválido" }, { status: 400 });
    }
  } catch (e) {
    return failure(e, "reports GET");
  }
}
