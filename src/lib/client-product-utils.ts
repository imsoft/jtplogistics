import { CLIENT_PRODUCT_TYPE_SUGGESTIONS } from "@/lib/constants/client-product-types";

/** Une tipos marcados y texto libre; elimina duplicados sin distinguir mayúsculas. */
export function mergeClientProductTypes(
  fromSuggestions: string[],
  otherLine: string
): string[] {
  const extras = otherLine.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...fromSuggestions, ...extras]) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function partitionClientProductTypes(types: string[] | undefined): {
  suggestionSet: Set<string>;
  otherText: string;
} {
  const list = types ?? [];
  const sugg = new Set<string>(CLIENT_PRODUCT_TYPE_SUGGESTIONS);
  const picked = new Set<string>();
  const others: string[] = [];
  for (const t of list) {
    if (sugg.has(t)) picked.add(t);
    else others.push(t);
  }
  return { suggestionSet: picked, otherText: others.join(", ") };
}
