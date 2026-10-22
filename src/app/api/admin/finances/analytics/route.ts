import { adminHandler } from "@/lib/api-handler";
import { computeFinancesAnalytics } from "@/lib/finances-analytics";

export type { FinancesAnalytics, RouteMargin, LegalNameCount } from "@/lib/finances-analytics";

export function GET() {
  return adminHandler(async () => Response.json(await computeFinancesAnalytics()));
}
