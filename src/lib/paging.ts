/**
 * skip/take de la URL a enteros válidos. Un "abc" o un negativo daba NaN y
 * Prisma respondía 500.
 */
export function readPaging(params: URLSearchParams, defaults = { take: 50, max: 100 }) {
  const int = (v: string | null, fallback: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : fallback;
  };
  return {
    skip: int(params.get("skip"), 0),
    take: Math.min(Math.max(int(params.get("take"), defaults.take), 1), defaults.max),
  };
}
