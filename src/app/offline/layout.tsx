/**
 * Dinámica a la fuerza por la CSP: una página prerenderizada sale sin el
 * nonce que firma los scripts y el navegador los bloquea (ver proxy.ts).
 * El service worker la guarda al instalarse, así que sigue sirviendo sin red.
 */
export const dynamic = "force-dynamic";

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
